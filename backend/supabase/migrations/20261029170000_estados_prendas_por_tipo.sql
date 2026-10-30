-- Control de producción: una columna de estado por tipo de prenda en lugar de agrupar por categoría.
-- estado_camperas_buzos  -> estado_camperas + estado_buzos
-- estado_chombas_remeras -> estado_chombas  + estado_remeras
-- Las nuevas columnas arrancan con el valor que tenía la categoría, así no se pierden los "Ok" ya marcados.

ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS estado_camperas text NOT NULL DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS estado_buzos    text NOT NULL DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS estado_chombas  text NOT NULL DEFAULT 'Pendiente',
ADD COLUMN IF NOT EXISTS estado_remeras  text NOT NULL DEFAULT 'Pendiente';

UPDATE public.pedidos
SET estado_camperas = estado_camperas_buzos,
    estado_buzos    = estado_camperas_buzos,
    estado_chombas  = estado_chombas_remeras,
    estado_remeras  = estado_chombas_remeras;

ALTER TABLE public.pedidos
ADD CONSTRAINT pedidos_estado_camperas_check CHECK (estado_camperas IN ('Pendiente', 'Ok')),
ADD CONSTRAINT pedidos_estado_buzos_check    CHECK (estado_buzos    IN ('Pendiente', 'Ok')),
ADD CONSTRAINT pedidos_estado_chombas_check  CHECK (estado_chombas  IN ('Pendiente', 'Ok')),
ADD CONSTRAINT pedidos_estado_remeras_check  CHECK (estado_remeras  IN ('Pendiente', 'Ok'));

ALTER TABLE public.pedidos
DROP CONSTRAINT IF EXISTS pedidos_estado_camperas_buzos_check,
DROP CONSTRAINT IF EXISTS pedidos_estado_chombas_remeras_check;

ALTER TABLE public.pedidos
DROP COLUMN IF EXISTS estado_camperas_buzos,
DROP COLUMN IF EXISTS estado_chombas_remeras;
