
alter table public.pedidos
  add column if not exists fecha_entrega_aproximada date;
