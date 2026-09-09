CREATE SEQUENCE IF NOT EXISTS nro_pedido_seq START 1;

ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS nro_fabrica INT UNIQUE;

CREATE OR REPLACE FUNCTION enviar_pedido_a_fabrica(p_id_pedido integer)
RETURNS integer AS $$
DECLARE
  v_nro integer;
BEGIN
  IF EXISTS (SELECT 1 FROM pedidos WHERE id_pedido = p_id_pedido AND nro_fabrica IS NOT NULL) THEN
    RAISE EXCEPTION 'El pedido ya fue enviado a fábrica';
  END IF;

  v_nro := nextval('nro_pedido_seq');

  UPDATE pedidos
  SET nro_fabrica = v_nro
  WHERE id_pedido = p_id_pedido;

  RETURN v_nro;
END;
$$ LANGUAGE plpgsql;