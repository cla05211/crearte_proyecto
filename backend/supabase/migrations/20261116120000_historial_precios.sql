
create table if not exists public.precios_productos_historial (
  id                 bigint generated always as identity primary key,
  id_precio_producto bigint      not null,   -- id de la fila en precios_productos
  id_producto        bigint      not null,
  cantidad_desde     integer     not null,
  cantidad_hasta     integer     not null,
  cuotas             integer     not null,
  con_senia          boolean     not null,
  valor_senia        numeric     not null,
  valor_cuota        numeric     not null,
  vigente_desde      timestamptz not null default now()
);

create index if not exists precios_productos_historial_busqueda_idx
  on public.precios_productos_historial (id_producto, id_precio_producto, vigente_desde desc);

alter table public.precios_productos_historial enable row level security;

create or replace function public.registrar_historial_precio_producto()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if tg_op = 'INSERT'
     or new.valor_senia    is distinct from old.valor_senia
     or new.valor_cuota    is distinct from old.valor_cuota
     or new.cantidad_desde is distinct from old.cantidad_desde
     or new.cantidad_hasta is distinct from old.cantidad_hasta
     or new.cuotas         is distinct from old.cuotas
     or new.con_senia      is distinct from old.con_senia then
    insert into precios_productos_historial
      (id_precio_producto, id_producto, cantidad_desde, cantidad_hasta, cuotas, con_senia, valor_senia, valor_cuota)
    values
      (new.id, new.id_producto, new.cantidad_desde, new.cantidad_hasta, new.cuotas, new.con_senia, new.valor_senia, new.valor_cuota);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_historial_precios_productos on public.precios_productos;
create trigger trg_historial_precios_productos
after insert or update on public.precios_productos
for each row execute function public.registrar_historial_precio_producto();

insert into public.precios_productos_historial
  (id_precio_producto, id_producto, cantidad_desde, cantidad_hasta, cuotas, con_senia, valor_senia, valor_cuota, vigente_desde)
select id, id_producto, cantidad_desde, cantidad_hasta, cuotas, con_senia, valor_senia, valor_cuota, '-infinity'
from public.precios_productos
where not exists (select 1 from public.precios_productos_historial);

create or replace function public.precio_producto_en_fecha(
  p_id_producto bigint,
  p_cuotas      integer,
  p_cantidad    integer,
  p_fecha       timestamptz,
  p_con_senia   boolean default null
)
returns table (valor_senia numeric, valor_cuota numeric)
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
    select v.valor_senia, v.valor_cuota
    from versiones v
    where v.cuotas = p_cuotas
      and (p_con_senia is null or v.con_senia = p_con_senia)
      and p_cantidad between v.cantidad_desde and v.cantidad_hasta
  )
  select * from en_fecha
  union all
  select pp.valor_senia, pp.valor_cuota
  from precios_productos pp
  where not exists (select 1 from en_fecha)
    and pp.id_producto = p_id_producto
    and pp.cuotas = p_cuotas
    and (p_con_senia is null or pp.con_senia = p_con_senia)
    and p_cantidad between pp.cantidad_desde and pp.cantidad_hasta
  limit 1;
$$;

create table if not exists public.agregados_historial (
  id            bigint generated always as identity primary key,
  id_agregado   bigint      not null,   -- id en agregados
  precio        numeric,
  vigente_desde timestamptz not null default now()
);

create index if not exists agregados_historial_busqueda_idx
  on public.agregados_historial (id_agregado, vigente_desde desc);

alter table public.agregados_historial enable row level security;

create or replace function public.registrar_historial_agregado()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.precio is distinct from old.precio then
    insert into agregados_historial (id_agregado, precio) values (new.id, new.precio);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_historial_agregados on public.agregados;
create trigger trg_historial_agregados
after insert or update on public.agregados
for each row execute function public.registrar_historial_agregado();

insert into public.agregados_historial (id_agregado, precio, vigente_desde)
select id, precio, '-infinity'
from public.agregados
where not exists (select 1 from public.agregados_historial);

create or replace function public.precio_agregado_en_fecha(p_id_agregado bigint, p_fecha timestamptz)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(
    (select h.precio
       from agregados_historial h
      where h.id_agregado = p_id_agregado
        and h.vigente_desde <= p_fecha
      order by h.vigente_desde desc, h.id desc
      limit 1),
    (select a.precio from agregados a where a.id = p_id_agregado)
  );
$$;

create or replace function public.agregados_en_fecha(p_fecha timestamptz)
returns table (id bigint, agregado text, individual boolean, precio numeric)
language sql
stable
set search_path = public
as $$
  select a.id, a.agregado, a.individual, public.precio_agregado_en_fecha(a.id, p_fecha)
  from agregados a;
$$;
