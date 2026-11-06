-- Devolución por baja (pago negativo con motivo 'Devolución', ver 20261030150000_pagos_devolucion_baja.sql):
-- no se refleja en Cuentas Bancarias ni en Caja.
-- * pagos_banco: no se lista ni entra en los contadores del resumen.
-- * vista_caja: no aparece en el listado; la devolución en efectivo la cargan a mano como egreso.
-- Los totales (total del mes de bancos y total de efectivo de caja) se filtran igual en pagos.service.ts.
-- En el resto del sistema (pagos del cliente, deudores, estadísticas) la devolución sigue contando.

CREATE OR REPLACE VIEW pagos_banco
WITH (security_invoker = true) AS
SELECT
  min(p.id)                                         AS id,
  array_agg(p.id ORDER BY p.id)                     AS ids_pagos,
  p.id_documento,
  p.id_pedido,
  p.banco,
  min(p.fecha)                                      AS fecha,
  min(p.created_at)                                 AS created_at,
  max(p.nro_transferencia)                          AS nro_transferencia,
  max(p.entidad_pago)                               AS entidad_pago,
  sum(p.monto)                                      AS monto,
  string_agg(DISTINCT p.motivo, ' + ')              AS motivo,
  bool_and(coalesce(p.aprobado, false))             AS aprobado,
  bool_and(coalesce(p.enviado_banco, false))        AS enviado_banco,
  ped.estado_general,
  g.id                                              AS id_grupo,
  g.turno,
  g.orientacion,
  g.nivel,
  c.nombre                                          AS nombre_colegio,
  c.localidad
FROM pagos p
JOIN pedidos ped ON ped.id = p.id_pedido
JOIN grupos g ON g.id = ped.id_grupo
JOIN colegios c ON c.id = g.id_colegio
-- La devolución por baja no es plata que entró: no se lista ni se cuenta
WHERE p.motivo IS DISTINCT FROM 'Devolución'
GROUP BY
  coalesce(p.id_documento::text, 'pago-' || p.id::text),
  p.id_documento, p.id_pedido, p.banco,
  ped.estado_general, g.id, g.turno, g.orientacion, g.nivel, c.nombre, c.localidad;

create or replace view public.vista_caja as
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
  -- La devolución en efectivo la cargan a mano como egreso en movimientos_caja
  and p.motivo is distinct from 'Devolución'

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
