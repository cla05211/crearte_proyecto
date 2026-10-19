alter table public.padres_responsables
  add column principal boolean not null default false;

alter table public.alumnos_responsables
  add column principal boolean not null default false;

alter table public.pedidos
  drop column telefono_principal;
