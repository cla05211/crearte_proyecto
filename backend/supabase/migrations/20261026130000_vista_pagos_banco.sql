-- Cuentas Bancarias muestra una línea por comprobante.
-- registrar_pago_completo puede partir un mismo pago en dos filas (la parte que completa la seña
-- y el resto para cuotas), ambas con el mismo id_documento. El banco solo ve una transferencia,
-- así que acá se agrupan por comprobante y se suman los montos.
-- Los pagos sin comprobante quedan como una línea cada uno.
-- "id" es el pago más viejo del grupo: es el que usa el front para aprobar, marcar enviado y
-- descargar el comprobante (el backend aplica los cambios a todas las filas del grupo).
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
GROUP BY
  coalesce(p.id_documento::text, 'pago-' || p.id::text),
  p.id_documento, p.id_pedido, p.banco,
  ped.estado_general, g.id, g.turno, g.orientacion, g.nivel, c.nombre, c.localidad;
