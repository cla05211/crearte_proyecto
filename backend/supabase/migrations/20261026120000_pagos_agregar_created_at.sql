-- Fecha de recepción del pago: cuándo se guardó en el sistema.
-- La columna "fecha" sigue siendo la fecha del pago/comprobante que informa el cliente o la vendedora.
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS created_at timestamptz;

-- Pagos existentes: se usa la fecha en que se subió su comprobante (documentos.created_at,
-- que está guardado sin zona horaria en UTC).
-- Los que no tienen comprobante (efectivo) toman la fecha del pago, al mediodía de Argentina.
UPDATE pagos p
SET created_at = coalesce(
  (SELECT d.created_at AT TIME ZONE 'UTC' FROM documentos d WHERE d.id = p.id_documento),
  (p.fecha::text || ' 12:00:00-03')::timestamptz,
  now()
)
WHERE p.created_at IS NULL;

ALTER TABLE pagos ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE pagos ALTER COLUMN created_at SET NOT NULL;

-- Cuentas Bancarias lista por banco ordenando por fecha de recepción
CREATE INDEX IF NOT EXISTS idx_pagos_banco_created_at ON pagos (banco, created_at DESC);
