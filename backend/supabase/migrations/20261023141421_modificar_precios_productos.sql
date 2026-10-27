CREATE OR REPLACE FUNCTION public.modificar_precios_producto(
    p_id_producto BIGINT,
    p_precios JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_enviados INTEGER;
    v_total_actualizados INTEGER;
BEGIN
    -- Verificar que recibimos un array
    IF p_precios IS NULL OR jsonb_typeof(p_precios) <> 'array' THEN
        RAISE EXCEPTION 'Los precios deben enviarse en un array';
    END IF;

    -- Contar los precios recibidos
    SELECT COUNT(*)
    INTO v_total_enviados
    FROM jsonb_to_recordset(p_precios) AS datos(
        id BIGINT,
        valor_cuota NUMERIC,
        valor_senia NUMERIC
    );

    -- No hay precios para modificar
    IF v_total_enviados = 0 THEN
        RETURN 0;
    END IF;

    -- Validar los datos recibidos
    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_precios) AS datos(
            id BIGINT,
            valor_cuota NUMERIC,
            valor_senia NUMERIC
        )
        WHERE datos.id IS NULL
           OR datos.valor_cuota IS NULL
           OR datos.valor_senia IS NULL
           OR datos.valor_cuota < 0
           OR datos.valor_senia < 0
    ) THEN
        RAISE EXCEPTION 'Hay precios con datos inválidos';
    END IF;

    -- Evitar IDs repetidos
    IF EXISTS (
        SELECT datos.id
        FROM jsonb_to_recordset(p_precios) AS datos(
            id BIGINT,
            valor_cuota NUMERIC,
            valor_senia NUMERIC
        )
        GROUP BY datos.id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Hay IDs de precios duplicados';
    END IF;

    -- Actualizar todos los precios del producto
    UPDATE public.precios_productos AS p
    SET
        valor_cuota = datos.valor_cuota,
        valor_senia = datos.valor_senia
    FROM jsonb_to_recordset(p_precios) AS datos(
        id BIGINT,
        valor_cuota NUMERIC,
        valor_senia NUMERIC
    )
    WHERE p.id = datos.id
      AND p.id_producto = p_id_producto;

    -- Obtener la cantidad de registros actualizados
    GET DIAGNOSTICS v_total_actualizados = ROW_COUNT;

    -- Verificar que se actualizaron todos los precios enviados
    IF v_total_actualizados <> v_total_enviados THEN
        RAISE EXCEPTION
            'Se esperaban actualizar % precios, pero se actualizaron %',
            v_total_enviados,
            v_total_actualizados;
    END IF;

    RETURN v_total_actualizados;
END;
$$;