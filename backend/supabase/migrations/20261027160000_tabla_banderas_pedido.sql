-- Banderas de pedido: una fila por bandera, para seguir cada una por separado en la planilla de banderas.
-- Reemplaza las columnas de bandera que se habían agregado a pedidos (20261027144954_columnas_bandera.sql).
-- estado_bandera (Pendiente/Ok de control de producción) NO se toca: sigue en pedidos.

alter table pedidos
  drop column if exists estado_boceto_bandera,
  drop column if exists id_disenadora_bandera,
  drop column if exists motivo_perdida_bandera;

create table if not exists public.banderas_pedido (
  id bigint generated always as identity primary key,
  id_pedido bigint not null references public.pedidos(id) on delete cascade,
  origen text not null check (origen in ('Beneficio', 'Comprada')),
  estado_boceto text not null default 'Pendiente de hablar'
    check (estado_boceto in ('Pendiente de hablar', 'Sin respuesta', 'Diseñada', 'Confirmada')),
  id_disenadora bigint references public.usuarios(id) on delete set null,
  motivo_perdida_beneficio text, -- null = no perdió el beneficio
  created_at timestamptz not null default now(),
  constraint banderas_pedido_perdida_solo_beneficio
    check (motivo_perdida_beneficio is null or origen = 'Beneficio')
);

create index if not exists banderas_pedido_id_pedido_idx on public.banderas_pedido (id_pedido);
create index if not exists banderas_pedido_id_disenadora_idx on public.banderas_pedido (id_disenadora);

alter table public.banderas_pedido enable row level security;

-- Genera las filas de bandera de un pedido a partir de sus beneficios y agregados:
--   beneficio 1 (bandera)  -> una fila por cada unidad de beneficios_pedido.cantidad
--   agregado 53 (bandera)  -> una fila por cada fila de agregados_globales_pedido
-- Si el pedido ya tiene banderas no hace nada (por si sale y vuelve a "En producción").
-- Mismos ids que PedidosService.tieneBandera() en el backend.
create or replace function generar_banderas_pedido(p_id_pedido bigint)
returns void as $$
begin
  if exists (select 1 from banderas_pedido where id_pedido = p_id_pedido) then
    return;
  end if;

  insert into banderas_pedido (id_pedido, origen)
  select bp.id_pedido, 'Beneficio'
  from beneficios_pedido bp
  cross join generate_series(1, bp.cantidad)
  where bp.id_pedido = p_id_pedido
    and bp.id_beneficio = 1;

  insert into banderas_pedido (id_pedido, origen)
  select agp.id_pedido, 'Comprada'
  from agregados_globales_pedido agp
  where agp.id_pedido = p_id_pedido
    and agp.id_agregado = 53;
end;
$$ language plpgsql;

-- Misma RPC que 20261021160000_rpc_enviar_pedido_a_fabrica.sql, ahora también genera las banderas.
CREATE OR REPLACE FUNCTION enviar_pedido_a_fabrica(p_id_pedido bigint, p_mes integer, p_anio integer)
RETURNS integer AS $$
DECLARE
  v_estado        text;
  v_id_cuota      bigint;
  v_vencimiento   date;
  v_ultimo_dia    integer;
  v_fecha_entrega date;
  v_nro           integer;
BEGIN
  IF p_mes NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'Mes de entrega inválido';
  END IF;

  SELECT estado_general INTO v_estado
  FROM pedidos
  WHERE id = p_id_pedido
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido no existe';
  END IF;

  IF v_estado IS DISTINCT FROM 'Listo para enviar a producción' THEN
    RAISE EXCEPTION 'El pedido no está listo para enviar a producción';
  END IF;

  SELECT id, fecha_vencimiento INTO v_id_cuota, v_vencimiento
  FROM cuotas
  WHERE id_pedido = p_id_pedido
  ORDER BY numero DESC
  LIMIT 1;

  v_ultimo_dia := extract(day from (make_date(p_anio, p_mes, 1) + interval '1 month - 1 day'))::integer;

  IF v_id_cuota IS NOT NULL AND v_vencimiento IS NOT NULL THEN
    v_fecha_entrega := make_date(p_anio, p_mes, least(extract(day from v_vencimiento)::integer, v_ultimo_dia));

    UPDATE cuotas SET fecha_vencimiento = v_fecha_entrega WHERE id = v_id_cuota;
  ELSE
    v_fecha_entrega := make_date(p_anio, p_mes, 1);
  END IF;

  UPDATE pedidos
  SET fecha_entrega_aproximada = v_fecha_entrega,
      estado_general = 'En producción'
  WHERE id = p_id_pedido
  RETURNING nro_fabrica INTO v_nro;

  PERFORM generar_banderas_pedido(p_id_pedido);

  RETURN v_nro;
END;
$$ LANGUAGE plpgsql;

-- Pedidos que ya estaban en producción antes de esta migración
select generar_banderas_pedido(id)
from pedidos
where estado_general = 'En producción';
