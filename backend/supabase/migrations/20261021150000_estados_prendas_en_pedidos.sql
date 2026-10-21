-- El estado de producción pasa de cada fila de productos_pedidos a una columna por categoría en pedidos.
-- Motivo: un combo (ej. "Campera y Chomba") es una sola fila pero aparece en dos categorías, la bandera
-- no es un producto, y modificar_plan_pedido borra y reinserta productos_pedidos (reseteaba el estado).

ALTER TABLE public.productos_pedidos
DROP CONSTRAINT IF EXISTS productos_pedidos_estado_check;

ALTER TABLE public.productos_pedidos
DROP COLUMN IF EXISTS estado;

ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS estado_camperas_buzos  text NOT NULL DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS estado_chombas_remeras text NOT NULL DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS estado_pantalon        text NOT NULL DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS estado_bandera         text NOT NULL DEFAULT 'Pendiente';

ALTER TABLE public.pedidos
ADD CONSTRAINT pedidos_estado_camperas_buzos_check  CHECK (estado_camperas_buzos  IN ('Pendiente', 'Ok')),
ADD CONSTRAINT pedidos_estado_chombas_remeras_check CHECK (estado_chombas_remeras IN ('Pendiente', 'Ok')),
ADD CONSTRAINT pedidos_estado_pantalon_check        CHECK (estado_pantalon        IN ('Pendiente', 'Ok')),
ADD CONSTRAINT pedidos_estado_bandera_check         CHECK (estado_bandera         IN ('Pendiente', 'Ok'));
