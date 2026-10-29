-- Cada bandera se marca a mano como enviada a producción (la mandaron a fábrica) desde la planilla de banderas.
-- Es independiente de pedidos.estado_bandera, que marca Control Producción cuando la bandera vuelve de fábrica y está Ok.
alter table public.banderas_pedido
  add column if not exists enviado_produccion boolean not null default false;
