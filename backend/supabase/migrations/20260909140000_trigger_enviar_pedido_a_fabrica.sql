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

DROP TRIGGER IF EXISTS trg_enviar_pedido_a_fabrica ON pedidos;

CREATE TRIGGER trg_enviar_pedido_a_fabrica
BEFORE UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION enviar_pedido_a_fabrica_trigger();
