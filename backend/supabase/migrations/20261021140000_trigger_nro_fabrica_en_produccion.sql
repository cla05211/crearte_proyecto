-- Al pasar un pedido a "En producción" (botón "Enviar a fábrica" de control de fábrica)
-- se le asigna automáticamente el nro_fabrica siguiente.
-- Solo si todavía no tenía número: si el pedido sale y vuelve a "En producción", conserva el suyo.

CREATE OR REPLACE FUNCTION asignar_nro_fabrica_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW.estado_general = 'En producción'
     AND OLD.estado_general IS DISTINCT FROM 'En producción'
     AND NEW.nro_fabrica IS NULL
  THEN
    NEW.nro_fabrica := nextval('nro_pedido_seq');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asignar_nro_fabrica ON pedidos;

CREATE TRIGGER trg_asignar_nro_fabrica
BEFORE UPDATE OF estado_general ON pedidos
FOR EACH ROW
EXECUTE FUNCTION asignar_nro_fabrica_trigger();
