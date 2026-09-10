-- pagos.fecha es un date (sin hora), y varios pagos del mismo día comparten
-- el mismo valor. El "order by fecha desc" de vista_caja no tenía desempate,
-- así que al insertar un pago nuevo Postgres podía reordenar filas viejas
-- empatadas en esa fecha, dando la impresión de que aparecían "de la nada".
-- Se agrega una columna "orden" (el id de origen) para desempatar de forma
-- estable, más reciente primero dentro del mismo día.
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
  'pagos'::text as origen,
  p.id as orden
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
  'movimientos_caja'::text as origen,
  mc.id as orden
from movimientos_caja mc;
