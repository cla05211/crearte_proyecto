-- Beneficios por tramo de cantidad, guardados en precios_productos.
-- Cuando en el recálculo por talles los productos con beneficios (campera, buzo, combos) bajan de tramo,
-- el pedido pierde sus beneficios y recibe los del tramo nuevo, según los vigentes a la fecha de venta.
--
-- Formato: [{ "id_beneficio": 3, "cantidad": 2 }]
-- Los beneficios no dependen del plan: todas las filas de un mismo producto y tramo tienen que tener los
-- mismos (modificar_beneficios_producto las actualiza juntas y agregarPlan los copia al crear un plan).

-- ============================================================
-- 1) Columna nueva (la vieja era texto libre y no se usaba)
-- ============================================================
alter table public.precios_productos drop column if exists beneficio;
alter table public.precios_productos add column if not exists beneficios jsonb not null default '[]'::jsonb;

-- ============================================================
-- 2) Historial: los beneficios también se versionan
-- ============================================================
alter table public.precios_productos_historial add column if not exists beneficios jsonb not null default '[]'::jsonb;

create or replace function public.registrar_historial_precio_producto()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Activar/desactivar un plan no genera versión nueva: solo cambios de precio, tramo, plan o beneficios
  if tg_op = 'INSERT'
     or new.valor_senia    is distinct from old.valor_senia
     or new.valor_cuota    is distinct from old.valor_cuota
     or new.cantidad_desde is distinct from old.cantidad_desde
     or new.cantidad_hasta is distinct from old.cantidad_hasta
     or new.cuotas         is distinct from old.cuotas
     or new.con_senia      is distinct from old.con_senia
     or new.beneficios     is distinct from old.beneficios then
    insert into precios_productos_historial
      (id_precio_producto, id_producto, cantidad_desde, cantidad_hasta, cuotas, con_senia, valor_senia, valor_cuota, beneficios)
    values
      (new.id, new.id_producto, new.cantidad_desde, new.cantidad_hasta, new.cuotas, new.con_senia, new.valor_senia, new.valor_cuota, new.beneficios);
  end if;
  return new;
end;
$$;

-- ============================================================
-- 3) Tramo y beneficios de un producto para una cantidad, vigentes en una fecha.
--    No filtra por plan (los beneficios son iguales en todos): toma una fila del tramo.
--    Si no hay versión anterior a la fecha, usa el catálogo actual.
-- ============================================================
create or replace function public.beneficios_tramo_en_fecha(
  p_id_producto bigint,
  p_cantidad    integer,
  p_fecha       timestamptz
)
returns table (cantidad_desde integer, cantidad_hasta integer, beneficios jsonb)
language sql
stable
set search_path = public
as $$
  with versiones as (
    select distinct on (h.id_precio_producto) h.*
    from precios_productos_historial h
    where h.id_producto = p_id_producto
      and h.vigente_desde <= p_fecha
    order by h.id_precio_producto, h.vigente_desde desc, h.id desc
  ),
  en_fecha as (
    select v.cantidad_desde, v.cantidad_hasta, v.beneficios
    from versiones v
    where p_cantidad between v.cantidad_desde and v.cantidad_hasta
    order by v.id_precio_producto
    limit 1
  )
  select * from en_fecha
  union all
  select * from (
    select pp.cantidad_desde, pp.cantidad_hasta, pp.beneficios
    from precios_productos pp
    where not exists (select 1 from en_fecha)
      and pp.id_producto = p_id_producto
      and p_cantidad between pp.cantidad_desde and pp.cantidad_hasta
    order by pp.id
    limit 1
  ) actual;
$$;

-- ============================================================
-- 4) Guardar los beneficios de los tramos de un producto (todos los planes juntos)
--    p_tramos: [{ "cantidad_desde": 26, "cantidad_hasta": 40, "beneficios": [{ "id_beneficio": 3, "cantidad": 2 }] }]
-- ============================================================
create or replace function public.modificar_beneficios_producto(p_id_producto bigint, p_tramos jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  tramo        jsonb;
  v_filas      integer;
  v_total      integer := 0;
begin
  if p_tramos is null or jsonb_typeof(p_tramos) <> 'array' then
    raise exception 'Los tramos deben enviarse en un array';
  end if;

  for tramo in select * from jsonb_array_elements(p_tramos)
  loop
    if jsonb_typeof(coalesce(tramo->'beneficios', 'null'::jsonb)) <> 'array' then
      raise exception 'Cada tramo tiene que traer su lista de beneficios';
    end if;

    if exists (
      select 1 from jsonb_array_elements(tramo->'beneficios') b
      where (b->>'id_beneficio') is null
         or coalesce((b->>'cantidad')::int, 0) <= 0
         or not exists (select 1 from beneficios be where be.id = (b->>'id_beneficio')::bigint)
    ) then
      raise exception 'Hay beneficios inválidos (inexistentes o con cantidad menor a 1)';
    end if;

    update precios_productos
    set beneficios = (
      -- Un mismo beneficio una sola vez por tramo (se suman las cantidades)
      select coalesce(jsonb_agg(jsonb_build_object('id_beneficio', id_beneficio, 'cantidad', cantidad) order by id_beneficio), '[]'::jsonb)
      from (
        select (b->>'id_beneficio')::bigint as id_beneficio, sum((b->>'cantidad')::int) as cantidad
        from jsonb_array_elements(tramo->'beneficios') b
        group by 1
      ) agrupados
    )
    where id_producto = p_id_producto
      and cantidad_desde = (tramo->>'cantidad_desde')::int
      and cantidad_hasta = (tramo->>'cantidad_hasta')::int;

    get diagnostics v_filas = row_count;
    if v_filas = 0 then
      raise exception 'El producto % no tiene el tramo % a %', p_id_producto, tramo->>'cantidad_desde', tramo->>'cantidad_hasta';
    end if;
    v_total := v_total + v_filas;
  end loop;

  return v_total;
end;
$$;

-- ============================================================
-- 5) Plan + beneficios en una sola transacción (recálculo por talles cuando bajan de tramo).
--    Si el payload no trae "beneficios", es igual a modificar_plan_pedido.
-- ============================================================
create or replace function public.modificar_plan_y_beneficios_pedido(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if payload ? 'beneficios' then
    perform modificar_beneficios_pedido((payload->>'id_pedido')::bigint, payload->'beneficios');
  end if;

  return modificar_plan_pedido(payload);
end;
$$;

-- Solo el backend (service_role) llama a las funciones (ver 20261110120000_seguridad_funciones_rls.sql)
revoke execute on function public.beneficios_tramo_en_fecha(bigint, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.modificar_beneficios_producto(bigint, jsonb) from public, anon, authenticated;
revoke execute on function public.modificar_plan_y_beneficios_pedido(jsonb) from public, anon, authenticated;
grant execute on function public.beneficios_tramo_en_fecha(bigint, integer, timestamptz) to service_role;
grant execute on function public.modificar_beneficios_producto(bigint, jsonb) to service_role;
grant execute on function public.modificar_plan_y_beneficios_pedido(jsonb) to service_role;
