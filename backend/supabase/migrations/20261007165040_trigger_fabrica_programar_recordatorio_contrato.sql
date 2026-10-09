-- Agrega al trigger de envío a fábrica la programación del recordatorio de contrato.
-- El IF se cumple una sola vez por pedido: cuando el boceto está aprobado y los talles
-- confirmados (sin importar desde qué camino se haya completado lo último).
-- En ese momento se le carga fecha_programada a la notificación "recordatorio_contrato",
-- y el cron diario la envía.

CREATE OR REPLACE FUNCTION enviar_pedido_a_fabrica_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW.fecha_aprobacion_boceto IS NOT NULL
     AND NEW.estado_talles = 'Confirmado'
     AND NEW.nro_fabrica IS NULL
  THEN
    NEW.nro_fabrica := nextval('nro_pedido_seq');

    UPDATE notificaciones_whatsapp
    SET fecha_programada = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    WHERE id_pedido = NEW.id
      AND plantilla = 'recordatorio_contrato'
      AND estado = 'pendiente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
