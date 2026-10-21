-- El trigger de fábrica ya no asigna nro_fabrica (ahora lo asigna administración al enviar a fábrica).
-- Cuando el boceto está aprobado y los talles confirmados, el pedido pasa a "Listo para enviar a producción".

DROP TRIGGER IF EXISTS trg_enviar_pedido_a_fabrica ON pedidos;
DROP FUNCTION IF EXISTS enviar_pedido_a_fabrica_trigger();

CREATE OR REPLACE FUNCTION marcar_pedido_listo_produccion_trigger()
RETURNS trigger AS $$
BEGIN
  -- Solo desde "Venta realizada": si el pedido ya avanzó a otro estado, no lo hace retroceder
  IF NEW.fecha_aprobacion_boceto IS NOT NULL
     AND NEW.estado_talles = 'Confirmado'
     AND NEW.estado_general = 'Venta realizada'
  THEN
    NEW.estado_general := 'Listo para enviar a producción';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marcar_pedido_listo_produccion ON pedidos;

-- Solo corre cuando cambia alguna de las dos aprobaciones
CREATE TRIGGER trg_marcar_pedido_listo_produccion
BEFORE UPDATE OF fecha_aprobacion_boceto, estado_talles ON pedidos
FOR EACH ROW
EXECUTE FUNCTION marcar_pedido_listo_produccion_trigger();

-- Datos existentes: los pedidos que ya tienen nro_fabrica los había mandado a fábrica el trigger viejo.
-- Pasan a "En producción" para que Fábrica (que ahora filtra por estado) los siga viendo.
UPDATE pedidos
SET estado_general = 'En producción'
WHERE nro_fabrica IS NOT NULL
  AND estado_general = 'Venta realizada';
