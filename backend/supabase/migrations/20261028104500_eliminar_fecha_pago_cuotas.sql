-- fecha_pago quedó sin uso desde que la info de pagos por cuota vive en pagos (monto_cubierto / detalle_cuotas).
-- Verificado sin datos antes de eliminar.

alter table public.cuotas
  drop column if exists fecha_pago;
