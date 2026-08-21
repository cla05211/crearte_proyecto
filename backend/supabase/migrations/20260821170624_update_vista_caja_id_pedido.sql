drop view if exists public.vista_caja;

create view public.vista_caja as
select
  ('pagos-' || p.id)::text as id,
  p.fecha,
  'ingreso'::text as tipo,
  'Pago cliente'::text as categoria,
  coalesce(p.motivo, 'Pago pedido #' || p.id_pedido)::text as descripcion,
  p.monto::numeric as monto,
  null::bigint as usuario,
  p.id_pedido as id_pedido,
  'pagos'::text as origen
from pagos p
where p.banco ilike 'Efectivo'

union all

select
  ('caja-' || mc.id)::text as id,
  mc.fecha,
  mc.tipo,
  mc.categoria,
  mc.descripcion,
  mc.monto,
  mc.usuario,
  null::bigint as id_pedido,
  'movimientos_caja'::text as origen
from movimientos_caja mc;