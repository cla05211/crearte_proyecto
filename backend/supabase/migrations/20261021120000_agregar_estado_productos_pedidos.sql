-- Estado de producción de cada prenda del pedido (campera/buzo, chomba/remera, pantalón, etc).
-- Arranca en 'Pendiente' y pasa a 'Ok' cuando esa prenda está lista.
-- Las filas existentes y las que crean las RPCs (crear_pedido_completo, modificar plan) toman el default.

ALTER TABLE public.productos_pedidos
ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'Pendiente';

ALTER TABLE public.productos_pedidos
ADD CONSTRAINT productos_pedidos_estado_check CHECK (estado IN ('Pendiente', 'Ok'));
