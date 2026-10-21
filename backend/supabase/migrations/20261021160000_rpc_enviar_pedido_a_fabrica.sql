-- Reemplaza la RPC vieja (usaba una columna id_pedido que no existe en pedidos).
-- Envía un pedido a fábrica en una sola transacción:
--   1. Valida que esté "Listo para enviar a producción" (bloquea la fila: dos clics a la vez no lo envían dos veces).
--   2. Mueve el vencimiento de la última cuota al mes/año de entrega (mismo día, ajustado si el mes es más corto).
--   3. Guarda fecha_entrega_aproximada (= ese vencimiento; si no hay cuotas, el día 1 del mes).
--   4. Pasa el pedido a "En producción": trg_asignar_nro_fabrica le asigna el nro_fabrica.
-- Devuelve el nro_fabrica asignado.

DROP FUNCTION IF EXISTS enviar_pedido_a_fabrica(integer);

CREATE OR REPLACE FUNCTION enviar_pedido_a_fabrica(p_id_pedido bigint, p_mes integer, p_anio integer)
RETURNS integer AS $$
DECLARE
  v_estado        text;
  v_id_cuota      bigint;
  v_vencimiento   date;
  v_ultimo_dia    integer;
  v_fecha_entrega date;
  v_nro           integer;
BEGIN
  IF p_mes NOT BETWEEN 1 AND 12 THEN
    RAISE EXCEPTION 'Mes de entrega inválido';
  END IF;

  SELECT estado_general INTO v_estado
  FROM pedidos
  WHERE id = p_id_pedido
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pedido no existe';
  END IF;

  IF v_estado IS DISTINCT FROM 'Listo para enviar a producción' THEN
    RAISE EXCEPTION 'El pedido no está listo para enviar a producción';
  END IF;

  SELECT id, fecha_vencimiento INTO v_id_cuota, v_vencimiento
  FROM cuotas
  WHERE id_pedido = p_id_pedido
  ORDER BY numero DESC
  LIMIT 1;

  v_ultimo_dia := extract(day from (make_date(p_anio, p_mes, 1) + interval '1 month - 1 day'))::integer;

  IF v_id_cuota IS NOT NULL AND v_vencimiento IS NOT NULL THEN
    v_fecha_entrega := make_date(p_anio, p_mes, least(extract(day from v_vencimiento)::integer, v_ultimo_dia));

    UPDATE cuotas SET fecha_vencimiento = v_fecha_entrega WHERE id = v_id_cuota;
  ELSE
    v_fecha_entrega := make_date(p_anio, p_mes, 1);
  END IF;

  UPDATE pedidos
  SET fecha_entrega_aproximada = v_fecha_entrega,
      estado_general = 'En producción'
  WHERE id = p_id_pedido
  RETURNING nro_fabrica INTO v_nro;

  RETURN v_nro;
END;
$$ LANGUAGE plpgsql;
