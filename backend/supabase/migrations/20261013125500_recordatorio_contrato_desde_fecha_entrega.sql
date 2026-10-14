-- El recordatorio de contrato ahora depende de la fecha de entrega aproximada, no de las aprobaciones.
--
-- 1. El trigger de fábrica vuelve a solo asignar nro_fabrica (ya no programa el recordatorio).
-- 2. Cuando se carga fecha_entrega_aproximada por primera vez (que es cuando el cliente puede ver
--    el contrato), el recordatorio_contrato pendiente se programa para 7 días después.
-- 3. Cuando el contrato queda firmado (contratos.firmado = true), el recordatorio pendiente se cancela.
--    El cron igual vuelve a chequear contratos.firmado antes de enviar.

-- 1. Trigger de fábrica sin el recordatorio
CREATE OR REPLACE FUNCTION enviar_pedido_a_fabrica_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW.fecha_aprobacion_boceto IS NOT NULL
     AND NEW.estado_talles = 'Confirmado'
     AND NEW.nro_fabrica IS NULL
  THEN
    NEW.nro_fabrica := nextval('nro_pedido_seq');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Programar el recordatorio 7 días después de cargar la fecha de entrega
CREATE OR REPLACE FUNCTION programar_recordatorio_contrato_trigger()
RETURNS trigger AS $$
BEGIN
  UPDATE notificaciones_whatsapp
  SET fecha_programada = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + 7
  WHERE id_pedido = NEW.id
    AND plantilla = 'recordatorio_contrato'
    AND estado = 'pendiente';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_programar_recordatorio_contrato ON pedidos;

CREATE TRIGGER trg_programar_recordatorio_contrato
AFTER UPDATE OF fecha_entrega_aproximada ON pedidos
FOR EACH ROW
WHEN (OLD.fecha_entrega_aproximada IS NULL AND NEW.fecha_entrega_aproximada IS NOT NULL)
EXECUTE FUNCTION programar_recordatorio_contrato_trigger();

-- 3. Cancelar el recordatorio cuando el contrato queda firmado
CREATE OR REPLACE FUNCTION cancelar_recordatorio_contrato_trigger()
RETURNS trigger AS $$
BEGIN
  UPDATE notificaciones_whatsapp n
  SET estado = 'cancelado'
  FROM pedidos p
  WHERE n.id_pedido = p.id
    AND p.id_grupo = NEW.grupo
    AND n.plantilla = 'recordatorio_contrato'
    AND n.estado = 'pendiente';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cancelar_recordatorio_contrato ON contratos;

CREATE TRIGGER trg_cancelar_recordatorio_contrato
AFTER INSERT OR UPDATE OF firmado ON contratos
FOR EACH ROW
WHEN (NEW.firmado IS TRUE)
EXECUTE FUNCTION cancelar_recordatorio_contrato_trigger();

-- Datos existentes: recordatorios que el trigger viejo programó para pedidos que todavía
-- no tienen fecha de entrega. Se les saca la fecha para que no salgan antes de tiempo;
-- se vuelven a programar solos cuando se cargue la fecha de entrega.
UPDATE notificaciones_whatsapp n
SET fecha_programada = NULL
FROM pedidos p
WHERE n.id_pedido = p.id
  AND n.plantilla = 'recordatorio_contrato'
  AND n.estado = 'pendiente'
  AND p.fecha_entrega_aproximada IS NULL;
