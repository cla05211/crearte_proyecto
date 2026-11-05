alter table public.precios_productos
  add column con_senia boolean,
  add column activo    boolean not null default true;

-- Hoy cada valor de cuotas es un solo plan, así que se puede completar solo
-- (o a mano, como dijiste; revisalo igual después)
update public.precios_productos p
set con_senia = sub.con_senia
from (
  select cuotas, bool_or(valor_senia <> valor_cuota) as con_senia
  from public.precios_productos
  group by cuotas
) sub
where p.cuotas = sub.cuotas;

alter table public.precios_productos
  alter column con_senia set not null,
  add constraint precios_productos_unico
    unique (id_producto, cuotas, con_senia, cantidad_desde);