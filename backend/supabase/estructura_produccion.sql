


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "whatsapp";


ALTER SCHEMA "whatsapp" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."agregados_en_fecha"("p_fecha" timestamp with time zone) RETURNS TABLE("id" bigint, "agregado" "text", "individual" boolean, "precio" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select a.id, a.agregado, a.individual, public.precio_agregado_en_fecha(a.id, p_fecha)
  from agregados a;
$$;


ALTER FUNCTION "public"."agregados_en_fecha"("p_fecha" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."asignar_nro_fabrica_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.estado_general = 'En producción'
     AND OLD.estado_general IS DISTINCT FROM 'En producción'
     AND NEW.nro_fabrica IS NULL
  THEN
    NEW.nro_fabrica := nextval('nro_pedido_seq');
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."asignar_nro_fabrica_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."beneficios_tramo_en_fecha"("p_id_producto" bigint, "p_cantidad" integer, "p_fecha" timestamp with time zone) RETURNS TABLE("cantidad_desde" integer, "cantidad_hasta" integer, "beneficios" "jsonb")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with versiones as (
    select distinct on (h.id_precio_producto) h.*
    from precios_productos_historial h
    where h.id_producto = p_id_producto
      and h.vigente_desde <= p_fecha
    order by h.id_precio_producto, h.vigente_desde desc, h.id desc
  ),
  en_fecha as (
    select v.cantidad_desde, v.cantidad_hasta, v.beneficios
    from versiones v
    where p_cantidad between v.cantidad_desde and v.cantidad_hasta
    order by v.id_precio_producto
    limit 1
  )
  select * from en_fecha
  union all
  select * from (
    select pp.cantidad_desde, pp.cantidad_hasta, pp.beneficios
    from precios_productos pp
    where not exists (select 1 from en_fecha)
      and pp.id_producto = p_id_producto
      and p_cantidad between pp.cantidad_desde and pp.cantidad_hasta
    order by pp.id
    limit 1
  ) actual;
$$;


ALTER FUNCTION "public"."beneficios_tramo_en_fecha"("p_id_producto" bigint, "p_cantidad" integer, "p_fecha" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancelar_recordatorio_contrato_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."cancelar_recordatorio_contrato_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."crear_pedido_completo"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  id_colegio      bigint;
  id_grupo        bigint;
  id_pedido       bigint;
  id_pago         bigint;
  id_documento    bigint;
  producto        jsonb;
  beneficio       jsonb;
  padre           jsonb;
  alumno          jsonb;
  primer_padre    boolean := true;
  primer_alumno   boolean := true;
  documento       jsonb;
  pago            jsonb;
  agregado_global jsonb;
  nro_cuotas      int;
  fecha_primera   date;
  importe_cuota   numeric;
  importe_ultima  numeric;
  numero_primera  int;
  dia_original    int;
  fecha_mes_base  date;
  ultimo_dia_mes  int;
  fecha_calculada date;
  i               int;
  usuario_base    text;
  usuario_final   text;
  intento         int;
begin
  if payload->'pedidoDTO'->>'con_senia' is null then
    raise exception 'Falta indicar si el plan del pedido es con seña (pedidoDTO.con_senia).';
  end if;

  -- Colegio (con deduplicación por nombre + localidad, igual que crearColegio())
  select id into id_colegio
  from colegios
  where nombre = payload->'colegioDTO'->>'nombre'
    and localidad = payload->'colegioDTO'->>'localidad'
  limit 1;

  if id_colegio is null then
    insert into colegios (nombre, localidad, provincia, zona_sur)
    values (
      payload->'colegioDTO'->>'nombre',
      payload->'colegioDTO'->>'localidad',
      payload->'colegioDTO'->>'provincia',
      coalesce((payload->'colegioDTO'->>'zona_sur')::boolean, false)
    )
    returning id into id_colegio;
  else
    -- Colegio ya existente: se respeta lo que se marcó en esta venta.
    update colegios
    set zona_sur = coalesce((payload->'colegioDTO'->>'zona_sur')::boolean, zona_sur)
    where id = id_colegio;
  end if;

  -- Grupo
  insert into grupos (id_colegio, orientacion, turno, nivel, promo, cantidad_egresados)
  values (
    id_colegio,
    payload->'grupoDTO'->>'orientacion',
    payload->'grupoDTO'->>'turno',
    payload->'grupoDTO'->>'nivel',
    (payload->'grupoDTO'->>'promo')::bigint,
    (payload->'grupoDTO'->>'cantidad_egresados')::bigint
  )
  returning id into id_grupo;

  -- Cliente: acceso al portal para este grupo
  usuario_base := payload->>'usuario';
  usuario_final := usuario_base;
  intento := 1;

  while exists (select 1 from clientes where usuario = usuario_final) loop
    intento := intento + 1;
    usuario_final := usuario_base || intento::text;
  end loop;

  insert into clientes (id_grupo, usuario, contrasena_hash)
  values (id_grupo, usuario_final, payload->>'contrasena_hash');

  -- Pedido
  insert into pedidos (
    id_grupo, talles, envio_gratis, observaciones, estado_general,
    fecha_aprobacion_boceto, fecha_aprobacion_talles, colores,molderias,
    cantidad_hermanos, porcentaje_descuento_hermanos, id_vendedora,
    estado_boceto, estado_talles, id_disenadora, con_senia, senia_total
  )
  values (
    id_grupo,
    payload->'pedidoDTO'->>'talles',
    (payload->'pedidoDTO'->>'envio_gratis')::boolean,
    payload->'pedidoDTO'->>'observaciones',
    payload->'pedidoDTO'->>'estado_general',
    (payload->'pedidoDTO'->>'fecha_aprobacion_boceto')::date,
    (payload->'pedidoDTO'->>'fecha_aprobacion_talles')::date,
    payload->'pedidoDTO'->>'colores',
    payload->'pedidoDTO'->>'molderias',
    coalesce((payload->'pedidoDTO'->>'cantidad_hermanos')::smallint, 0),
    (payload->'pedidoDTO'->>'porcentaje_descuento_hermanos')::smallint,
    (payload->'pedidoDTO'->>'id_vendedora')::bigint,
    payload->'pedidoDTO'->>'estado_boceto',
    payload->'pedidoDTO'->>'estado_talles',
    (payload->'pedidoDTO'->>'id_disenadora')::bigint,
    (payload->'pedidoDTO'->>'con_senia')::boolean,
    round((payload->'pedidoDTO'->>'senia_total')::numeric, 0)
  )
  returning id into id_pedido;

  -- Productos del pedido
  for producto in select * from jsonb_array_elements(payload->'productosPedidoDTO')
  loop
    insert into productos_pedidos (
      id_pedido, id_producto_original, cantidad, descripcion, valor_senia, valor_cuota, agregados
    )
    values (
      id_pedido,
      (producto->>'id_producto_original')::bigint,
      (producto->>'cantidad')::int,
      producto->>'descripcion',
      (producto->>'valor_senia')::numeric,
      (producto->>'valor_cuota')::numeric,
      coalesce(producto->'agregados', '[]'::jsonb)
    );
  end loop;

  -- Beneficios del pedido (elegidos del catálogo por la vendedora)
  for beneficio in select * from jsonb_array_elements(coalesce(payload->'beneficiosDTO', '[]'::jsonb))
  loop
    insert into beneficios_pedido (id_pedido, id_beneficio, cantidad)
    values (
      id_pedido,
      (beneficio->>'id_beneficio')::bigint,
      coalesce((beneficio->>'cantidad')::int, 1)
    );
  end loop;

  -- Agregados globales del pedido (ej. bandera)
  for agregado_global in select * from jsonb_array_elements(coalesce(payload->'agregadosGlobalesDTO', '[]'::jsonb))
  loop
    insert into agregados_globales_pedido (id_pedido, id_agregado, precio)
    values (
      id_pedido,
      (agregado_global->>'id_agregado')::bigint,
      coalesce((agregado_global->>'precio')::numeric,
               (select a.precio from agregados a where a.id = (agregado_global->>'id_agregado')::bigint))
    );
  end loop;

  -- Padres responsables
  for padre in select * from jsonb_array_elements(payload->'padresResponsablesDTO')
  loop
    insert into padres_responsables (nombre, apellido, dni, telefono, id_grupo, principal)
    values (
      padre->>'nombre',
      padre->>'apellido',
      padre->>'dni',
      padre->>'telefono',
      id_grupo,
      primer_padre
    );
    primer_padre := false;
  end loop;

  -- Alumnos responsables
  for alumno in select * from jsonb_array_elements(payload->'alumnosResponsablesDTO')
  loop
    insert into alumnos_responsables (id_grupo, nombre, apellido, telefono, principal)
    values (
      id_grupo,
      alumno->>'nombre',
      alumno->>'apellido',
      alumno->>'telefono',
      primer_alumno
    );
    primer_alumno := false;
  end loop;

  -- Pagos, cada uno con su propio comprobante (1 a 1)
  FOR pago IN SELECT * FROM jsonb_array_elements(payload->'pagosDTO')
  LOOP
    id_documento := null;

    IF pago->'documentoDTO' IS NOT NULL AND jsonb_typeof(pago->'documentoDTO') <> 'null' THEN
      INSERT INTO documentos (id_grupo, tipo, archivo_url)
      VALUES (
        id_grupo,
        pago->'documentoDTO'->>'tipo',
        pago->'documentoDTO'->>'archivo_url'
      )
      RETURNING id INTO id_documento;
    END IF;

    INSERT INTO pagos (id_pedido, id_documento, nro_transferencia, monto, motivo, fecha, aprobado, banco, entidad_pago)
    VALUES (
      id_pedido,
      id_documento,
      pago->>'nro_transferencia',
      (pago->>'monto')::numeric,
      pago->>'motivo',
      (pago->>'fecha')::date,
      (pago->>'aprobado')::boolean,
      pago->>'banco',
      pago->>'entidad_pago'
    )
    RETURNING id INTO id_pago;
  END LOOP;

  -- Documentos que no son comprobante de ningún pago (ej: recursos adicionales)
  IF payload->'documentoDTO' IS NOT NULL AND jsonb_typeof(payload->'documentoDTO') <> 'null' THEN
    if jsonb_typeof(payload->'documentoDTO') = 'array' then
      for documento in select * from jsonb_array_elements(payload->'documentoDTO')
      loop
        insert into documentos (id_grupo, tipo, archivo_url)
        values (id_grupo, documento->>'tipo', documento->>'archivo_url');
      end loop;
    else
      insert into documentos (id_grupo, tipo, archivo_url)
      values (
        id_grupo,
        payload->'documentoDTO'->>'tipo',
        payload->'documentoDTO'->>'archivo_url'
      );
    end if;
  END IF;

  -- Cuotas: primera viene en 'primerCuota', el resto se calculan
  -- replicando CuotasService.acomodarFecha().
  nro_cuotas     := (payload->>'nroCuotas')::int;
  fecha_primera  := (payload->'primerCuota'->>'fecha_vencimiento')::date;
  -- Importes en pesos enteros (en las pantallas no se muestran centavos y se paga el número redondo);
  -- la última cuota absorbe la diferencia del redondeo
  importe_cuota  := round((payload->'primerCuota'->>'importe')::numeric, 0);
  importe_ultima := round((payload->'primerCuota'->>'importe')::numeric * nro_cuotas, 0) - importe_cuota * (nro_cuotas - 1);
  numero_primera := coalesce((payload->'primerCuota'->>'numero')::int, 1);
  dia_original   := extract(day from fecha_primera);

  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado)
  values (id_pedido, numero_primera, fecha_primera, case when nro_cuotas = 1 then importe_ultima else importe_cuota end, 'Pendiente');

  for i in 1..(nro_cuotas - 1) loop
    fecha_mes_base := (date_trunc('month', fecha_primera) + (i || ' months')::interval)::date;
    ultimo_dia_mes := extract(day from (fecha_mes_base + interval '1 month - 1 day'));
    fecha_calculada := fecha_mes_base + (least(dia_original, ultimo_dia_mes) - 1);

    insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado)
    values (id_pedido, numero_primera + i, fecha_calculada,
            case when i = nro_cuotas - 1 then importe_ultima else importe_cuota end, 'Pendiente');
  end loop;

    -- Muestras físicas (solo si el pedido no es de talles digitales)
  if (payload->'pedidoDTO'->>'talles') is distinct from 'Digital' then
    insert into muestras_fisicas (id_pedido, estado)
    values (id_pedido, 'Pendiente');
  end if;

  return jsonb_build_object('id_pedido', id_pedido, 'usuario', usuario_final);
end;
$$;


ALTER FUNCTION "public"."crear_pedido_completo"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."eliminar_pago_completo"("p_id_pago" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id_pedido integer;
  v_restante numeric;
  v_falta_cuota numeric;
  cuota record;
begin
  delete from pagos
  where id = p_id_pago
  returning id_pedido into v_id_pedido;

  if v_id_pedido is null then
    raise exception 'No existe el pago con id %', p_id_pago;
  end if;

  update cuotas
  set estado = 'Pendiente', monto_cubierto = 0
  where id_pedido = v_id_pedido;

  select round(coalesce(sum(monto), 0), 2) into v_restante
  from pagos
  where id_pedido = v_id_pedido
    and motivo is distinct from 'Seña'
    -- La devolución por baja no descuenta de las cuotas: las cuotas pagadas siguen pagadas
    and motivo is distinct from 'Devolución';

  for cuota in
    select * from cuotas
    where id_pedido = v_id_pedido
    order by numero asc
  loop
    exit when v_restante <= 0;

    v_falta_cuota := round((cuota.importe - coalesce(cuota.monto_cubierto, 0))::numeric, 2);

    if v_restante >= v_falta_cuota then
      update cuotas
      set estado = 'Pagada', monto_cubierto = cuota.importe
      where id_pedido = v_id_pedido and numero = cuota.numero;

      v_restante := round(v_restante - v_falta_cuota, 2);
    else
      update cuotas
      set estado = 'Parcial', monto_cubierto = coalesce(cuota.monto_cubierto, 0) + v_restante
      where id_pedido = v_id_pedido and numero = cuota.numero;

      v_restante := 0;
    end if;
  end loop;

  return v_id_pedido;
end;
$$;


ALTER FUNCTION "public"."eliminar_pago_completo"("p_id_pago" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enviar_pedido_a_fabrica"("p_id_pedido" bigint, "p_mes" integer, "p_anio" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
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

  PERFORM generar_banderas_pedido(p_id_pedido);

  RETURN v_nro;
END;
$$;


ALTER FUNCTION "public"."enviar_pedido_a_fabrica"("p_id_pedido" bigint, "p_mes" integer, "p_anio" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generar_banderas_pedido"("p_id_pedido" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  if exists (select 1 from banderas_pedido where id_pedido = p_id_pedido) then
    return;
  end if;

  insert into banderas_pedido (id_pedido, origen)
  select bp.id_pedido, 'Beneficio'
  from beneficios_pedido bp
  cross join generate_series(1, bp.cantidad)
  where bp.id_pedido = p_id_pedido
    and bp.id_beneficio = 1;

  insert into banderas_pedido (id_pedido, origen)
  select agp.id_pedido, 'Comprada'
  from agregados_globales_pedido agp
  where agp.id_pedido = p_id_pedido
    and agp.id_agregado = 53;
end;
$$;


ALTER FUNCTION "public"."generar_banderas_pedido"("p_id_pedido" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."marcar_pedido_listo_produccion_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."marcar_pedido_listo_produccion_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modificar_beneficios_pedido"("p_id_pedido" bigint, "p_beneficios" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  delete from beneficios_pedido where id_pedido = p_id_pedido;

  insert into beneficios_pedido (id_pedido, id_beneficio, cantidad)
  select p_id_pedido,
         (b->>'id_beneficio')::bigint,
         sum(coalesce((b->>'cantidad')::int, 1))
  from jsonb_array_elements(coalesce(p_beneficios, '[]'::jsonb)) as b
  group by (b->>'id_beneficio')::bigint;
end;
$$;


ALTER FUNCTION "public"."modificar_beneficios_pedido"("p_id_pedido" bigint, "p_beneficios" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modificar_beneficios_producto"("p_id_producto" bigint, "p_tramos" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  tramo        jsonb;
  v_filas      integer;
  v_total      integer := 0;
begin
  if p_tramos is null or jsonb_typeof(p_tramos) <> 'array' then
    raise exception 'Los tramos deben enviarse en un array';
  end if;

  for tramo in select * from jsonb_array_elements(p_tramos)
  loop
    if jsonb_typeof(coalesce(tramo->'beneficios', 'null'::jsonb)) <> 'array' then
      raise exception 'Cada tramo tiene que traer su lista de beneficios';
    end if;

    if exists (
      select 1 from jsonb_array_elements(tramo->'beneficios') b
      where (b->>'id_beneficio') is null
         or coalesce((b->>'cantidad')::int, 0) <= 0
         or not exists (select 1 from beneficios be where be.id = (b->>'id_beneficio')::bigint)
    ) then
      raise exception 'Hay beneficios inválidos (inexistentes o con cantidad menor a 1)';
    end if;

    update precios_productos
    set beneficios = (
      -- Un mismo beneficio una sola vez por tramo (se suman las cantidades)
      select coalesce(jsonb_agg(jsonb_build_object('id_beneficio', id_beneficio, 'cantidad', cantidad) order by id_beneficio), '[]'::jsonb)
      from (
        select (b->>'id_beneficio')::bigint as id_beneficio, sum((b->>'cantidad')::int) as cantidad
        from jsonb_array_elements(tramo->'beneficios') b
        group by 1
      ) agrupados
    )
    where id_producto = p_id_producto
      and cantidad_desde = (tramo->>'cantidad_desde')::int
      and cantidad_hasta = (tramo->>'cantidad_hasta')::int;

    get diagnostics v_filas = row_count;
    if v_filas = 0 then
      raise exception 'El producto % no tiene el tramo % a %', p_id_producto, tramo->>'cantidad_desde', tramo->>'cantidad_hasta';
    end if;
    v_total := v_total + v_filas;
  end loop;

  return v_total;
end;
$$;


ALTER FUNCTION "public"."modificar_beneficios_producto"("p_id_producto" bigint, "p_tramos" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modificar_plan_pedido"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_id_pedido           bigint;
  v_nueva_cant_cuotas   int;
  v_valor_cuota_nuevo   numeric;
  v_valor_senia_nuevo   numeric;

  producto              jsonb;
  agregado_global       jsonb;

  v_senia_actual        numeric;
  v_senia_pagada        numeric;
  v_senia_final         numeric;
  v_total_pagado        numeric;
  v_total_plan_nuevo    numeric;

  v_cant_actual         int;
  v_max_pagada          int;
  v_suma_pagadas        numeric;
  v_restante            numeric;
  v_libres              int;
  v_parte               numeric;
  v_asignado            numeric;
  v_libres_restantes    int;
  v_disponible          numeric;

  v_fecha_primera       date;
  v_fecha_entrega       date;
  v_dia_original        int;
  v_fecha_mes_base      date;
  v_ultimo_dia_mes      int;
  v_fecha_calculada     date;
  v_fecha_anterior      date;

  r                     record;
  i                     int;
  v_importe             numeric;
  v_cubierto            numeric;
  v_estado              text;
begin
  v_id_pedido         := (payload->>'id_pedido')::bigint;
  v_nueva_cant_cuotas := (payload->>'nueva_cantidad_cuotas')::int;
  v_valor_cuota_nuevo := (payload->>'valor_cuota_nuevo')::numeric;
  v_valor_senia_nuevo := coalesce((payload->>'valor_senia_nuevo')::numeric, 0);

  if v_id_pedido is null then
    raise exception 'Falta id_pedido en el payload';
  end if;

  if v_nueva_cant_cuotas is null or v_nueva_cant_cuotas <= 0 then
    raise exception 'nueva_cantidad_cuotas debe ser mayor a 0';
  end if;

  if payload->'productos' is null or jsonb_array_length(payload->'productos') = 0 then
    raise exception 'El pedido debe tener al menos un producto';
  end if;

  select fecha_vencimiento into v_fecha_primera
  from cuotas
  where id_pedido = v_id_pedido and numero = 1;

  if v_fecha_primera is null then
    raise exception 'No se encontró la cuota número 1 del pedido %. No se puede recalcular el plan.', v_id_pedido;
  end if;

  select fecha_entrega_aproximada, senia_total into v_fecha_entrega, v_senia_actual
  from pedidos
  where id = v_id_pedido
  for update;

  -- ---- Seña: se toma ANTES de borrar los productos ----
  if v_senia_actual is null then
    select coalesce(sum(valor_senia * cantidad), 0) into v_senia_actual
    from productos_pedidos
    where id_pedido = v_id_pedido;
  end if;

  select coalesce(sum(monto), 0) into v_senia_pagada
  from pagos
  where id_pedido = v_id_pedido and motivo = 'Seña';

  -- Con algún pago la seña queda fija y su diferencia va a las cuotas; sin pagos se actualiza
  v_senia_final := case when v_senia_pagada > 0 then v_senia_actual else round(v_valor_senia_nuevo::numeric, 0) end;

  -- ---- Productos: se borran todos y se insertan de cero ----
  delete from productos_pedidos where id_pedido = v_id_pedido;

  for producto in select * from jsonb_array_elements(payload->'productos')
  loop
    insert into productos_pedidos (
      id_pedido, id_producto_original, cantidad, descripcion, valor_senia, valor_cuota, agregados
    )
    values (
      v_id_pedido,
      (producto->>'id_producto_original')::bigint,
      (producto->>'cantidad')::int,
      producto->>'descripcion',
      (producto->>'valor_senia')::numeric,
      (producto->>'valor_cuota')::numeric,
      coalesce(producto->'agregados', '[]'::jsonb)
    );
  end loop;

  -- ---- Agregados globales del pedido: se borran todos y se insertan de cero ----
  delete from agregados_globales_pedido where id_pedido = v_id_pedido;

  for agregado_global in select * from jsonb_array_elements(coalesce(payload->'agregadosGlobales', '[]'::jsonb))
  loop
    insert into agregados_globales_pedido (id_pedido, id_agregado, precio)
    values (
      v_id_pedido,
      (agregado_global->>'id_agregado')::bigint,
      coalesce((agregado_global->>'precio')::numeric,
               (select a.precio from agregados a where a.id = (agregado_global->>'id_agregado')::bigint))
    );
  end loop;

  update pedidos set senia_total = v_senia_final where id = v_id_pedido;

  -- Tipo de plan: lo manda el front cuando se elige un plan nuevo. El recálculo por talles no lo manda
  -- (no cambia el plan) y se conserva el que ya tenía el pedido.
  if payload->>'con_senia' is not null then
    update pedidos set con_senia = (payload->>'con_senia')::boolean where id = v_id_pedido;
  end if;

  -- ---- Cuotas ----
  v_total_plan_nuevo := v_valor_senia_nuevo + (v_nueva_cant_cuotas * v_valor_cuota_nuevo);

  select coalesce(sum(monto), 0) into v_total_pagado
  from pagos
  where id_pedido = v_id_pedido;

  if v_total_pagado > v_total_plan_nuevo + 0.01 then
    raise exception 'El pago ya realizado ($%) supera el total del nuevo plan ($%). Hay un saldo a favor de $% que debe resolverse manualmente.', v_total_pagado, v_total_plan_nuevo, round((v_total_pagado - v_total_plan_nuevo)::numeric, 2);
  end if;

  select count(*) into v_cant_actual from cuotas where id_pedido = v_id_pedido;

  select coalesce(max(numero), 0), coalesce(sum(importe), 0)
  into v_max_pagada, v_suma_pagadas
  from cuotas
  where id_pedido = v_id_pedido and estado = 'Pagada';

  if v_max_pagada > v_nueva_cant_cuotas then
    raise exception 'El pedido ya tiene pagada la cuota %: el plan no puede tener menos cuotas que eso.', v_max_pagada;
  end if;

  -- Cuotas nuevas (si el plan se agrandó): se crean vacías, la fecha y el importe se completan abajo
  for i in (v_cant_actual + 1)..v_nueva_cant_cuotas loop
    insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado, monto_cubierto)
    values (v_id_pedido, i, v_fecha_primera, 0, 'Pendiente', 0);
  end loop;

  -- Si el plan se achicó, las cuotas que sobran se borran (on delete cascade se lleva sus recordatorios)
  delete from cuotas
  where id_pedido = v_id_pedido and numero > v_nueva_cant_cuotas;

  -- Lo que falta cobrar en cuotas
  -- En pesos enteros (en las pantallas no se muestran centavos y se paga el número redondo)
  v_restante := round((v_total_plan_nuevo - v_senia_final - v_suma_pagadas)::numeric, 0);

  if v_restante < -0.01 then
    raise exception 'Las cuotas ya pagadas ($%) superan lo que corresponde a cuotas en el nuevo plan. Debe resolverse manualmente.', v_suma_pagadas;
  end if;

  -- Plata pagada en cuotas (todo lo que no es seña) que no está aplicada a cuotas ya pagadas.
  -- Se reparte en orden sobre las cuotas que quedan: así lo cubierto siempre sale de los pagos reales.
  -- Lo pagado con motivo 'Seña' por encima de la seña fija (ej: en la venta pagaron de más y el
  -- excedente se aplicó a la cuota 1) también es plata para cuotas.
  select coalesce(sum(monto), 0) into v_disponible
  from pagos
  where id_pedido = v_id_pedido and motivo is distinct from 'Seña';

  v_disponible := v_disponible + greatest(v_senia_pagada - v_senia_final, 0);
  v_disponible := greatest(v_disponible - v_suma_pagadas, 0);

  select count(*) into v_libres
  from cuotas where id_pedido = v_id_pedido and estado <> 'Pagada';

  if v_libres = 0 then
    if abs(v_restante) > 0.01 then
      raise exception 'No quedan cuotas sin pagar para repartir la diferencia de $%. Agregá cuotas al plan o resolvelo manualmente.', round(v_restante::numeric, 2);
    end if;
  else
    -- Partes iguales redondeadas a centavos; la última absorbe el redondeo
    v_parte := round((v_restante / v_libres)::numeric, 0);
    v_asignado := 0;
    v_libres_restantes := v_libres;

    for r in
      select id from cuotas
      where id_pedido = v_id_pedido and estado <> 'Pagada'
      order by numero
    loop
      v_libres_restantes := v_libres_restantes - 1;
      v_importe := case when v_libres_restantes = 0 then round((v_restante - v_asignado)::numeric, 0) else v_parte end;
      v_asignado := v_asignado + v_importe;

      v_cubierto := least(v_disponible, v_importe);
      v_disponible := v_disponible - v_cubierto;

      v_estado := case
        when v_cubierto >= v_importe - 0.01 then 'Pagada'
        when v_cubierto > 0 then 'Parcial'
        else 'Pendiente'
      end;

      update cuotas
      set importe = v_importe, monto_cubierto = v_cubierto, estado = v_estado
      where id = r.id;
    end loop;
  end if;

  -- ---- Fechas de las cuotas no pagadas ----
  -- Mismo plan de cuotas: se conservan (pueden haberse ajustado a mano). Plan distinto: mes a mes desde la cuota 1.
  if v_nueva_cant_cuotas <> v_cant_actual then
    v_dia_original := extract(day from v_fecha_primera);

    for r in
      select id, numero from cuotas
      where id_pedido = v_id_pedido and estado <> 'Pagada' and numero > 1
    loop
      v_fecha_mes_base  := (date_trunc('month', v_fecha_primera) + ((r.numero - 1) || ' months')::interval)::date;
      v_ultimo_dia_mes  := extract(day from (v_fecha_mes_base + interval '1 month - 1 day'));
      v_fecha_calculada := v_fecha_mes_base + (least(v_dia_original, v_ultimo_dia_mes) - 1);

      update cuotas set fecha_vencimiento = v_fecha_calculada where id = r.id;
    end loop;
  end if;

  -- Pedido en fábrica: la última cuota vence en la fecha de entrega
  if v_fecha_entrega is not null then
    update cuotas set fecha_vencimiento = v_fecha_entrega
    where id_pedido = v_id_pedido and numero = v_nueva_cant_cuotas and estado <> 'Pagada';

    select max(fecha_vencimiento) into v_fecha_anterior
    from cuotas
    where id_pedido = v_id_pedido and numero < v_nueva_cant_cuotas;

    if v_fecha_anterior > v_fecha_entrega then
      raise exception 'Con % cuotas el plan se extiende más allá de la fecha de entrega (%). Elegí menos cuotas o cambiá la fecha de entrega.', v_nueva_cant_cuotas, to_char(v_fecha_entrega, 'DD/MM/YYYY');
    end if;
  end if;

  -- ---- Recordatorios de pago ----

  -- 1. La última cuota no lleva recordatorio
  update notificaciones_whatsapp n
  set estado = 'cancelado'
  from cuotas c
  where n.id_cuota = c.id
    and c.id_pedido = v_id_pedido
    and c.numero = v_nueva_cant_cuotas
    and n.plantilla = 'recordatorio_pago'
    and n.estado = 'pendiente';

  -- 2. Reactivar / resincronizar los de cuotas con deuda
  update notificaciones_whatsapp n
  set estado = 'pendiente',
      fecha_programada = c.fecha_vencimiento - 7
  from cuotas c
  where n.id_cuota = c.id
    and c.id_pedido = v_id_pedido
    and c.numero < v_nueva_cant_cuotas
    and c.estado <> 'Pagada'
    and n.plantilla = 'recordatorio_pago'
    and n.estado in ('pendiente', 'cancelado');

  -- 3. Crear los que falten
  insert into notificaciones_whatsapp (id_pedido, id_cuota, plantilla, estado, sector, fecha_programada)
  select v_id_pedido, c.id, 'recordatorio_pago', 'pendiente', 'Administración', c.fecha_vencimiento - 7
  from cuotas c
  where c.id_pedido = v_id_pedido
    and c.numero < v_nueva_cant_cuotas
    and c.estado <> 'Pagada'
    and not exists (
      select 1 from notificaciones_whatsapp n
      where n.id_cuota = c.id and n.plantilla = 'recordatorio_pago'
    );

  return jsonb_build_object(
    'id_pedido', v_id_pedido,
    'senia_total', v_senia_final,
    'cuotas_pagadas', (select count(*) from cuotas where id_pedido = v_id_pedido and estado = 'Pagada'),
    'total_pagado', v_total_pagado
  );
end;
$_$;


ALTER FUNCTION "public"."modificar_plan_pedido"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modificar_plan_y_beneficios_pedido"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if payload ? 'beneficios' then
    perform modificar_beneficios_pedido((payload->>'id_pedido')::bigint, payload->'beneficios');
  end if;

  return modificar_plan_pedido(payload);
end;
$$;


ALTER FUNCTION "public"."modificar_plan_y_beneficios_pedido"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."modificar_precios_producto"("p_id_producto" bigint, "p_precios" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."modificar_precios_producto"("p_id_producto" bigint, "p_precios" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."precio_agregado_en_fecha"("p_id_agregado" bigint, "p_fecha" timestamp with time zone) RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select h.precio
       from agregados_historial h
      where h.id_agregado = p_id_agregado
        and h.vigente_desde <= p_fecha
      order by h.vigente_desde desc, h.id desc
      limit 1),
    (select a.precio from agregados a where a.id = p_id_agregado)
  );
$$;


ALTER FUNCTION "public"."precio_agregado_en_fecha"("p_id_agregado" bigint, "p_fecha" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."precio_producto_en_fecha"("p_id_producto" bigint, "p_cuotas" integer, "p_cantidad" integer, "p_fecha" timestamp with time zone, "p_con_senia" boolean DEFAULT NULL::boolean) RETURNS TABLE("valor_senia" numeric, "valor_cuota" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  with versiones as (
    select distinct on (h.id_precio_producto) h.*
    from precios_productos_historial h
    where h.id_producto = p_id_producto
      and h.vigente_desde <= p_fecha
    order by h.id_precio_producto, h.vigente_desde desc, h.id desc
  ),
  en_fecha as (
    select v.valor_senia, v.valor_cuota
    from versiones v
    where v.cuotas = p_cuotas
      and (p_con_senia is null or v.con_senia = p_con_senia)
      and p_cantidad between v.cantidad_desde and v.cantidad_hasta
  )
  select * from en_fecha
  union all
  select pp.valor_senia, pp.valor_cuota
  from precios_productos pp
  where not exists (select 1 from en_fecha)
    and pp.id_producto = p_id_producto
    and pp.cuotas = p_cuotas
    and (p_con_senia is null or pp.con_senia = p_con_senia)
    and p_cantidad between pp.cantidad_desde and pp.cantidad_hasta
  limit 1;
$$;


ALTER FUNCTION "public"."precio_producto_en_fecha"("p_id_producto" bigint, "p_cuotas" integer, "p_cantidad" integer, "p_fecha" timestamp with time zone, "p_con_senia" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."programar_recordatorio_contrato_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE notificaciones_whatsapp
  SET fecha_programada = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date + 7
  WHERE id_pedido = NEW.id
    AND plantilla = 'recordatorio_contrato'
    AND estado = 'pendiente';

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."programar_recordatorio_contrato_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_historial_agregado"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' or new.precio is distinct from old.precio then
    insert into agregados_historial (id_agregado, precio) values (new.id, new.precio);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."registrar_historial_agregado"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_historial_precio_producto"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  -- Activar/desactivar un plan no genera versión nueva: solo cambios de precio, tramo, plan o beneficios
  if tg_op = 'INSERT'
     or new.valor_senia    is distinct from old.valor_senia
     or new.valor_cuota    is distinct from old.valor_cuota
     or new.cantidad_desde is distinct from old.cantidad_desde
     or new.cantidad_hasta is distinct from old.cantidad_hasta
     or new.cuotas         is distinct from old.cuotas
     or new.con_senia      is distinct from old.con_senia
     or new.beneficios     is distinct from old.beneficios then
    insert into precios_productos_historial
      (id_precio_producto, id_producto, cantidad_desde, cantidad_hasta, cuotas, con_senia, valor_senia, valor_cuota, beneficios)
    values
      (new.id, new.id_producto, new.cantidad_desde, new.cantidad_hasta, new.cuotas, new.con_senia, new.valor_senia, new.valor_cuota, new.beneficios);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."registrar_historial_precio_producto"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."registrar_pago_completo"("p_pago" "jsonb") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  v_id_pago integer;
  v_id_pedido integer;
  v_monto numeric;
  v_motivo text;
  v_restante numeric;
  v_falta_cuota numeric;
  v_detalle jsonb := '[]'::jsonb;
  v_senia_total numeric;
  v_senia_pagada numeric;
  v_senia_faltante numeric;
  v_monto_senia numeric;
  cuota record;
begin
  v_id_pedido := (p_pago->>'id_pedido')::integer;
  v_monto := (p_pago->>'monto')::numeric;
  v_motivo := p_pago->>'motivo';

  -- Los pagos negativos (devolución por baja) no pasan por acá: los inserta devolverPagos sin tocar las cuotas
  if v_monto is null or v_monto <= 0 then
    raise exception 'El monto del pago tiene que ser mayor a 0';
  end if;

  if v_motivo = 'Seña' then
    insert into pagos (
      id_pedido, nro_transferencia, monto, motivo, fecha, aprobado, banco, enviado_banco, entidad_pago, id_documento, detalle_cuotas
    )
    values (
      v_id_pedido,
      p_pago->>'nro_transferencia',
      v_monto,
      v_motivo,
      (p_pago->>'fecha')::date,
      (p_pago->>'aprobado')::boolean,
      p_pago->>'banco',
      (p_pago->>'enviado_banco')::boolean,
      p_pago->>'entidad_pago',
      (p_pago->>'id_documento')::bigint,
      jsonb_build_array(jsonb_build_object('tipo', 'senia'))
    )
    returning id into v_id_pago;

    return v_id_pago;
  end if;

  -- Seña acordada: pedidos.senia_total queda fija desde la primera modificación del plan.
  -- Mientras sea null vale la suma de valor_senia * cantidad (mismo criterio que calcularSeniaTotal en el back).
  select coalesce(
    (select senia_total from pedidos where id = v_id_pedido),
    (select sum(valor_senia * cantidad) from productos_pedidos where id_pedido = v_id_pedido),
    0
  ) into v_senia_total;

  select coalesce(sum(monto), 0) into v_senia_pagada
  from pagos
  where id_pedido = v_id_pedido and motivo = 'Seña';

  v_senia_faltante := greatest(round(v_senia_total - v_senia_pagada, 2), 0);
  v_restante := round(v_monto, 2);
  v_id_pago := null;

  if v_senia_faltante > 0 then
    v_monto_senia := least(v_restante, v_senia_faltante);

    insert into pagos (
      id_pedido, nro_transferencia, monto, motivo, fecha, aprobado, banco, enviado_banco, entidad_pago, id_documento, detalle_cuotas
    )
    values (
      v_id_pedido,
      p_pago->>'nro_transferencia',
      v_monto_senia,
      'Seña',
      (p_pago->>'fecha')::date,
      (p_pago->>'aprobado')::boolean,
      p_pago->>'banco',
      (p_pago->>'enviado_banco')::boolean,
      p_pago->>'entidad_pago',
      (p_pago->>'id_documento')::bigint,
      jsonb_build_array(jsonb_build_object('tipo', 'senia'))
    )
    returning id into v_id_pago;

    v_restante := round(v_restante - v_monto_senia, 2);
  end if;

  if v_restante > 0 then
    insert into pagos (
      id_pedido, nro_transferencia, monto, motivo, fecha, aprobado, banco, enviado_banco, entidad_pago, id_documento
    )
    values (
      v_id_pedido,
      p_pago->>'nro_transferencia',
      v_restante,
      v_motivo,
      (p_pago->>'fecha')::date,
      (p_pago->>'aprobado')::boolean,
      p_pago->>'banco',
      (p_pago->>'enviado_banco')::boolean,
      p_pago->>'entidad_pago',
      (p_pago->>'id_documento')::bigint
    )
    returning id into v_id_pago;

    for cuota in
      select * from cuotas
      where id_pedido = v_id_pedido
        and estado in ('Pendiente', 'Parcial', 'Adeudada')
      order by numero asc
    loop
      exit when v_restante <= 0;

      v_falta_cuota := round((cuota.importe - coalesce(cuota.monto_cubierto, 0))::numeric, 2);

      if v_restante >= v_falta_cuota then
        update cuotas
        set estado = 'Pagada', monto_cubierto = cuota.importe
        where id_pedido = v_id_pedido and numero = cuota.numero;

        v_detalle := v_detalle || jsonb_build_array(jsonb_build_object('tipo', 'completa', 'numero', cuota.numero, 'monto', v_falta_cuota));
        v_restante := round(v_restante - v_falta_cuota, 2);
      else
        update cuotas
        set estado = 'Parcial', monto_cubierto = coalesce(cuota.monto_cubierto, 0) + v_restante
        where id_pedido = v_id_pedido and numero = cuota.numero;

        v_detalle := v_detalle || jsonb_build_array(jsonb_build_object('tipo', 'parcial', 'numero', cuota.numero, 'monto', v_restante));
        v_restante := 0;
      end if;
    end loop;

    if v_restante > 0 then
      v_detalle := v_detalle || jsonb_build_array(jsonb_build_object('tipo', 'excedente', 'monto', v_restante));
    end if;

    update pagos set detalle_cuotas = v_detalle where id = v_id_pago;
  end if;

  return v_id_pago;
end;
$$;


ALTER FUNCTION "public"."registrar_pago_completo"("p_pago" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sumar_movimientos_caja"("p_tipo" "text") RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(sum(monto), 0)
  from public.movimientos_caja
  where tipo = p_tipo;
$$;


ALTER FUNCTION "public"."sumar_movimientos_caja"("p_tipo" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sumar_pagos"("p_bancos" "text"[] DEFAULT NULL::"text"[], "p_excluir_bancos" "text"[] DEFAULT NULL::"text"[], "p_desde" "date" DEFAULT NULL::"date", "p_hasta" "date" DEFAULT NULL::"date", "p_excluir_devolucion" boolean DEFAULT true) RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(sum(monto), 0)
  from public.pagos
  where (p_bancos is null or banco = any(p_bancos))
    and (p_excluir_bancos is null or banco <> all(p_excluir_bancos))
    and (p_desde is null or fecha >= p_desde)
    and (p_hasta is null or fecha < p_hasta)
    and (not p_excluir_devolucion or motivo is distinct from 'Devolución');
$$;


ALTER FUNCTION "public"."sumar_pagos"("p_bancos" "text"[], "p_excluir_bancos" "text"[], "p_desde" "date", "p_hasta" "date", "p_excluir_devolucion" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agregados" (
    "id" bigint NOT NULL,
    "agregado" "text",
    "precio" numeric,
    "individual" boolean DEFAULT true
);


ALTER TABLE "public"."agregados" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agregados_globales_pedido" (
    "id" bigint NOT NULL,
    "id_pedido" bigint,
    "id_agregado" bigint,
    "precio" numeric NOT NULL
);


ALTER TABLE "public"."agregados_globales_pedido" OWNER TO "postgres";


ALTER TABLE "public"."agregados_globales_pedido" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."agregados_globales_pedido_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."agregados_historial" (
    "id" bigint NOT NULL,
    "id_agregado" bigint NOT NULL,
    "precio" numeric,
    "vigente_desde" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agregados_historial" OWNER TO "postgres";


ALTER TABLE "public"."agregados_historial" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."agregados_historial_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."agregados" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."agregados_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."alumnos_responsables" (
    "id" bigint NOT NULL,
    "id_grupo" bigint NOT NULL,
    "nombre" "text",
    "apellido" "text",
    "telefono" "text",
    "principal" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."alumnos_responsables" OWNER TO "postgres";


ALTER TABLE "public"."alumnos_responsables" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."alumnos_responsables_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."auditoria" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "usuario" bigint,
    "tabla" "text" NOT NULL,
    "accion" "text" NOT NULL,
    "dato_anterior" "text",
    "dato_nuevo" "text",
    "registro_id_modificado" bigint,
    "id_pedido" bigint,
    "id_cliente" bigint,
    "despues_produccion" boolean DEFAULT false NOT NULL,
    CONSTRAINT "auditoria_autor_check" CHECK ((("usuario" IS NOT NULL) OR ("id_cliente" IS NOT NULL)))
);


ALTER TABLE "public"."auditoria" OWNER TO "postgres";


ALTER TABLE "public"."auditoria" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auditoria_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."banderas_pedido" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "origen" "text" NOT NULL,
    "estado_boceto" "text" DEFAULT 'Pendiente de hablar'::"text" NOT NULL,
    "id_disenadora" bigint,
    "motivo_perdida_beneficio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "enviado_produccion" boolean DEFAULT false NOT NULL,
    CONSTRAINT "banderas_pedido_estado_boceto_check" CHECK (("estado_boceto" = ANY (ARRAY['Pendiente de hablar'::"text", 'Sin respuesta'::"text", 'Diseñada'::"text", 'Confirmada'::"text"]))),
    CONSTRAINT "banderas_pedido_origen_check" CHECK (("origen" = ANY (ARRAY['Beneficio'::"text", 'Comprada'::"text"]))),
    CONSTRAINT "banderas_pedido_perdida_solo_beneficio" CHECK ((("motivo_perdida_beneficio" IS NULL) OR ("origen" = 'Beneficio'::"text")))
);


ALTER TABLE "public"."banderas_pedido" OWNER TO "postgres";


ALTER TABLE "public"."banderas_pedido" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."banderas_pedido_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."beneficios" (
    "id" bigint NOT NULL,
    "beneficio" "text",
    "id_producto" bigint
);


ALTER TABLE "public"."beneficios" OWNER TO "postgres";


ALTER TABLE "public"."beneficios" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."beneficios_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."beneficios_pedido" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "id_beneficio" bigint NOT NULL,
    "cantidad" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "beneficios_pedido_cantidad_check" CHECK (("cantidad" > 0))
);


ALTER TABLE "public"."beneficios_pedido" OWNER TO "postgres";


ALTER TABLE "public"."beneficios_pedido" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."beneficios_pedido_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" bigint NOT NULL,
    "id_grupo" bigint NOT NULL,
    "usuario" "text" NOT NULL,
    "contrasena_hash" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "token_activacion_hash" "text",
    "token_activacion_expira" timestamp with time zone
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


ALTER TABLE "public"."clientes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."clientes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."colegios" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "localidad" "text" NOT NULL,
    "provincia" "text" NOT NULL,
    "zona_sur" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."colegios" OWNER TO "postgres";


ALTER TABLE "public"."colegios" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."colegios_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."productos" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text" NOT NULL
);


ALTER TABLE "public"."productos" OWNER TO "postgres";


ALTER TABLE "public"."productos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."combos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."contratos" (
    "id" bigint NOT NULL,
    "grupo" bigint,
    "firmado" boolean,
    "fecha_generacion" "date",
    "fecha_firma" "date"
);


ALTER TABLE "public"."contratos" OWNER TO "postgres";


ALTER TABLE "public"."contratos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."contratos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cuotas" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "numero" integer,
    "fecha_vencimiento" "date",
    "importe" numeric,
    "estado" "text" DEFAULT '"Pendiente"'::"text",
    "monto_cubierto" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."cuotas" OWNER TO "postgres";


ALTER TABLE "public"."cuotas" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cuotas_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."documentos" (
    "id" bigint NOT NULL,
    "id_grupo" bigint NOT NULL,
    "tipo" "text",
    "archivo_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."documentos" OWNER TO "postgres";


ALTER TABLE "public"."documentos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."documentos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."grupos" (
    "id" bigint NOT NULL,
    "id_colegio" bigint NOT NULL,
    "orientacion" "text",
    "turno" "text",
    "nivel" "text",
    "promo" bigint,
    "cantidad_egresados" bigint,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."grupos" OWNER TO "postgres";


ALTER TABLE "public"."grupos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."grupos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."movimientos_caja" (
    "id" bigint NOT NULL,
    "fecha" "date" NOT NULL,
    "monto" numeric,
    "categoria" "text",
    "descripcion" "text",
    "usuario" bigint,
    "tipo" "text"
);


ALTER TABLE "public"."movimientos_caja" OWNER TO "postgres";


ALTER TABLE "public"."movimientos_caja" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."movimientos_caja_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."muestras_fisicas" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "estado" "text",
    "muestras" "text",
    "fecha_entrega" timestamp with time zone,
    "fecha_devolucion" timestamp with time zone,
    "envio" boolean
);


ALTER TABLE "public"."muestras_fisicas" OWNER TO "postgres";


ALTER TABLE "public"."muestras_fisicas" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."muestras_fisicas_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notificaciones_whatsapp" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "id_cuota" bigint,
    "plantilla" "text" NOT NULL,
    "estado" "text" DEFAULT 'pendiente'::"text" NOT NULL,
    "fecha_programada" "date",
    "sector" "text" NOT NULL,
    CONSTRAINT "notificaciones_whatsapp_estado_check" CHECK (("estado" = ANY (ARRAY['pendiente'::"text", 'enviado'::"text", 'error'::"text", 'cancelado'::"text"]))),
    CONSTRAINT "notificaciones_whatsapp_sector_check" CHECK (("sector" = ANY (ARRAY['Administración'::"text", 'Disenio'::"text", 'Talles'::"text"])))
);


ALTER TABLE "public"."notificaciones_whatsapp" OWNER TO "postgres";


ALTER TABLE "public"."notificaciones_whatsapp" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."notificaciones_whatsapp_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE SEQUENCE IF NOT EXISTS "public"."nro_pedido_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."nro_pedido_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."padres_responsables" (
    "id" bigint NOT NULL,
    "nombre" "text",
    "apellido" "text",
    "dni" "text",
    "telefono" "text",
    "mail" "text",
    "id_grupo" bigint NOT NULL,
    "firma" bigint,
    "principal" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."padres_responsables" OWNER TO "postgres";


ALTER TABLE "public"."padres_responsables" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."padres_responsables_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pagos" (
    "id" bigint NOT NULL,
    "id_pedido" bigint,
    "nro_transferencia" "text",
    "monto" numeric,
    "motivo" "text",
    "fecha" "date",
    "aprobado" boolean DEFAULT true,
    "banco" "text",
    "enviado_banco" boolean DEFAULT false,
    "entidad_pago" "text",
    "id_documento" bigint,
    "detalle_cuotas" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pagos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pedidos" (
    "id" bigint NOT NULL,
    "id_grupo" bigint NOT NULL,
    "talles" "text",
    "envio_gratis" boolean,
    "observaciones" "text",
    "estado_general" "text" DEFAULT 'Venta realizada'::"text",
    "fecha_aprobacion_boceto" "date",
    "fecha_aprobacion_talles" "date",
    "colores" "text",
    "cantidad_hermanos" smallint DEFAULT '0'::smallint,
    "porcentaje_descuento_hermanos" smallint,
    "id_vendedora" bigint,
    "estado_boceto" "text",
    "estado_talles" "text",
    "id_disenadora" bigint,
    "molderias" "text",
    "nro_fabrica" integer,
    "fecha_entrega_aproximada" "date",
    "estado_pantalon" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "estado_bandera" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "talles_edicion_habilitada" boolean DEFAULT false NOT NULL,
    "senia_total" numeric,
    "estado_camperas" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "estado_buzos" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "estado_chombas" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "estado_remeras" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "motivo_cancelacion" "text",
    "con_senia" boolean NOT NULL,
    CONSTRAINT "pedidos_estado_bandera_check" CHECK (("estado_bandera" = ANY (ARRAY['Pendiente'::"text", 'Ok'::"text"]))),
    CONSTRAINT "pedidos_estado_buzos_check" CHECK (("estado_buzos" = ANY (ARRAY['Pendiente'::"text", 'Ok'::"text"]))),
    CONSTRAINT "pedidos_estado_camperas_check" CHECK (("estado_camperas" = ANY (ARRAY['Pendiente'::"text", 'Ok'::"text"]))),
    CONSTRAINT "pedidos_estado_chombas_check" CHECK (("estado_chombas" = ANY (ARRAY['Pendiente'::"text", 'Ok'::"text"]))),
    CONSTRAINT "pedidos_estado_pantalon_check" CHECK (("estado_pantalon" = ANY (ARRAY['Pendiente'::"text", 'Ok'::"text"]))),
    CONSTRAINT "pedidos_estado_remeras_check" CHECK (("estado_remeras" = ANY (ARRAY['Pendiente'::"text", 'Ok'::"text"]))),
    CONSTRAINT "pedidos_motivo_cancelacion_check" CHECK ((("motivo_cancelacion" IS NULL) OR ("motivo_cancelacion" = ANY (ARRAY['Pocos egresados'::"text", 'Problemas con diseño'::"text", 'Problemas con talles'::"text", 'Otras cuestiones'::"text"]))))
);


ALTER TABLE "public"."pedidos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."pagos_banco" WITH ("security_invoker"='true') AS
 SELECT "min"("p"."id") AS "id",
    "array_agg"("p"."id" ORDER BY "p"."id") AS "ids_pagos",
    "p"."id_documento",
    "p"."id_pedido",
    "p"."banco",
    "min"("p"."fecha") AS "fecha",
    "min"("p"."created_at") AS "created_at",
    "max"("p"."nro_transferencia") AS "nro_transferencia",
    "max"("p"."entidad_pago") AS "entidad_pago",
    "sum"("p"."monto") AS "monto",
    "string_agg"(DISTINCT "p"."motivo", ' + '::"text") AS "motivo",
    "bool_and"(COALESCE("p"."aprobado", false)) AS "aprobado",
    "bool_and"(COALESCE("p"."enviado_banco", false)) AS "enviado_banco",
    "ped"."estado_general",
    "g"."id" AS "id_grupo",
    "g"."turno",
    "g"."orientacion",
    "g"."nivel",
    "c"."nombre" AS "nombre_colegio",
    "c"."localidad"
   FROM ((("public"."pagos" "p"
     JOIN "public"."pedidos" "ped" ON (("ped"."id" = "p"."id_pedido")))
     JOIN "public"."grupos" "g" ON (("g"."id" = "ped"."id_grupo")))
     JOIN "public"."colegios" "c" ON (("c"."id" = "g"."id_colegio")))
  WHERE ("p"."motivo" IS DISTINCT FROM 'Devolución'::"text")
  GROUP BY COALESCE(("p"."id_documento")::"text", ('pago-'::"text" || ("p"."id")::"text")), "p"."id_documento", "p"."id_pedido", "p"."banco", "ped"."estado_general", "g"."id", "g"."turno", "g"."orientacion", "g"."nivel", "c"."nombre", "c"."localidad";


ALTER VIEW "public"."pagos_banco" OWNER TO "postgres";


ALTER TABLE "public"."pagos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pagos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pedidos_envio" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "estado" "text" DEFAULT 'Pendiente de hablar'::"text" NOT NULL,
    "pago_realizado" "text" DEFAULT 'No'::"text" NOT NULL,
    "forma_entrega" "text" NOT NULL,
    "cant_bultos" integer,
    "empresa_envio" "text",
    "datos_envio" boolean DEFAULT false NOT NULL,
    "cotizacion" numeric,
    "id_comprobante" bigint,
    "id_movimiento_caja" bigint,
    "calendario" "text" DEFAULT 'Pendiente'::"text" NOT NULL,
    "fecha_entrega" "date",
    "entregado" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pedidos_envio_calendario_check" CHECK (("calendario" = ANY (ARRAY['Agendado'::"text", 'Pendiente'::"text", 'Comisionista'::"text"]))),
    CONSTRAINT "pedidos_envio_cant_bultos_check" CHECK (("cant_bultos" > 0)),
    CONSTRAINT "pedidos_envio_comprobante_solo_via_cargo" CHECK ((("id_comprobante" IS NULL) OR ("empresa_envio" = 'Via cargo'::"text"))),
    CONSTRAINT "pedidos_envio_cotizacion_check" CHECK (("cotizacion" >= (0)::numeric)),
    CONSTRAINT "pedidos_envio_efectivo_no_envio" CHECK ((("pago_realizado" <> 'Efectivo'::"text") OR ("forma_entrega" <> 'Envio'::"text"))),
    CONSTRAINT "pedidos_envio_empresa_envio_check" CHECK (("empresa_envio" = ANY (ARRAY['Via cargo'::"text", 'Andreani'::"text"]))),
    CONSTRAINT "pedidos_envio_entregado_con_fecha" CHECK (((NOT "entregado") OR ("fecha_entrega" IS NOT NULL))),
    CONSTRAINT "pedidos_envio_estado_check" CHECK (("estado" = ANY (ARRAY['Pendiente de hablar'::"text", 'Hable'::"text", 'Paga interés'::"text", 'Cliente demorado'::"text"]))),
    CONSTRAINT "pedidos_envio_forma_entrega_check" CHECK (("forma_entrega" = ANY (ARRAY['Envio'::"text", 'Retiro oficina'::"text", 'Comisionista'::"text"]))),
    CONSTRAINT "pedidos_envio_pago_realizado_check" CHECK (("pago_realizado" = ANY (ARRAY['Sí'::"text", 'No'::"text", 'Efectivo'::"text"])))
);


ALTER TABLE "public"."pedidos_envio" OWNER TO "postgres";


ALTER TABLE "public"."pedidos_envio" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."pedidos_envio_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."pedidos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pedidos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."permisos" (
    "id" bigint NOT NULL,
    "nombre" "text",
    "descripcion" "text"
);


ALTER TABLE "public"."permisos" OWNER TO "postgres";


ALTER TABLE "public"."permisos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."permisos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."precios_productos" (
    "id" bigint NOT NULL,
    "id_producto" bigint NOT NULL,
    "cantidad_desde" integer NOT NULL,
    "cantidad_hasta" integer NOT NULL,
    "cuotas" integer NOT NULL,
    "valor_senia" numeric NOT NULL,
    "valor_cuota" numeric NOT NULL,
    "con_senia" boolean NOT NULL,
    "activo" boolean DEFAULT true NOT NULL,
    "beneficios" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."precios_productos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."precios_productos_historial" (
    "id" bigint NOT NULL,
    "id_precio_producto" bigint NOT NULL,
    "id_producto" bigint NOT NULL,
    "cantidad_desde" integer NOT NULL,
    "cantidad_hasta" integer NOT NULL,
    "cuotas" integer NOT NULL,
    "con_senia" boolean NOT NULL,
    "valor_senia" numeric NOT NULL,
    "valor_cuota" numeric NOT NULL,
    "vigente_desde" timestamp with time zone DEFAULT "now"() NOT NULL,
    "beneficios" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."precios_productos_historial" OWNER TO "postgres";


ALTER TABLE "public"."precios_productos_historial" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."precios_productos_historial_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."precios_productos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."precios_productos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."prendas_pedido" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "talle" "text",
    "id_producto" bigint,
    "inscripcion" "text",
    "id_producto_pedido" bigint
);


ALTER TABLE "public"."prendas_pedido" OWNER TO "postgres";


ALTER TABLE "public"."prendas_pedido" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."prendas_pedido_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."producto_componentes" (
    "id" bigint NOT NULL,
    "id_producto_combo" bigint NOT NULL,
    "id_producto_componente" bigint NOT NULL,
    "cantidad" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."producto_componentes" OWNER TO "postgres";


ALTER TABLE "public"."producto_componentes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."producto_componentes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."productos_pedidos" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "id_producto_original" bigint NOT NULL,
    "cantidad" integer NOT NULL,
    "descripcion" "text",
    "valor_senia" numeric NOT NULL,
    "valor_cuota" numeric NOT NULL,
    "agregados" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."productos_pedidos" OWNER TO "postgres";


ALTER TABLE "public"."productos_pedidos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."productos_pedidos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" bigint NOT NULL,
    "rol" bigint NOT NULL,
    "nombre_rol" "text" NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


ALTER TABLE "public"."roles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."roles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."roles_permisos" (
    "id" bigint NOT NULL,
    "rol_nro" bigint,
    "permiso_id" bigint
);


ALTER TABLE "public"."roles_permisos" OWNER TO "postgres";


ALTER TABLE "public"."roles_permisos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."roles_permisos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sesiones_clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "id_cliente" integer NOT NULL,
    "token_hash" "text" NOT NULL,
    "creado_en" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expira_en" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."sesiones_clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" bigint NOT NULL,
    "id_auth" "uuid" NOT NULL,
    "nombre" "text",
    "apellido" "text",
    "rol" bigint,
    "aprobado" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


ALTER TABLE "public"."usuarios" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."usuarios_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."vista_caja" WITH ("security_invoker"='true') AS
 SELECT ('pagos-'::"text" || "p"."id") AS "id",
    "p"."fecha",
    'ingreso'::"text" AS "tipo",
    'Pago cliente'::"text" AS "categoria",
    COALESCE("p"."motivo", ('Pago pedido #'::"text" || "p"."id_pedido")) AS "descripcion",
    "p"."monto",
    NULL::bigint AS "usuario",
    "p"."id_pedido",
    'pagos'::"text" AS "origen",
    "p"."id" AS "orden"
   FROM "public"."pagos" "p"
  WHERE (("p"."banco" ~~* 'Efectivo'::"text") AND ("p"."motivo" IS DISTINCT FROM 'Devolución'::"text"))
UNION ALL
 SELECT ('caja-'::"text" || "mc"."id") AS "id",
    "mc"."fecha",
    "mc"."tipo",
    "mc"."categoria",
    "mc"."descripcion",
    "mc"."monto",
    "mc"."usuario",
    NULL::bigint AS "id_pedido",
    'movimientos_caja'::"text" AS "origen",
    "mc"."id" AS "orden"
   FROM "public"."movimientos_caja" "mc";


ALTER VIEW "public"."vista_caja" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "whatsapp"."chat_tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "normalized_name" "text" NOT NULL,
    "color" "text" DEFAULT '#00a884'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "whatsapp"."chat_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "whatsapp"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text" NOT NULL,
    "name" "text",
    "profile_pic" "text",
    "opted_out" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "whatsapp"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "whatsapp"."conversation_tags" (
    "conversation_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "whatsapp"."conversation_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "whatsapp"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contact_id" "uuid",
    "phone_number_id" "text",
    "last_message" "text",
    "last_message_at" timestamp with time zone,
    "unread_count" integer DEFAULT 0,
    "status" "text" DEFAULT 'open'::"text",
    "archived" boolean DEFAULT false NOT NULL,
    "assignees" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "whatsapp"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "whatsapp"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "wamid" "text",
    "direction" "text" NOT NULL,
    "type" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "messages_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"])))
);


ALTER TABLE "whatsapp"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "whatsapp"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "language" "text" DEFAULT 'es_AR'::"text",
    "category" "text",
    "components" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text",
    "meta_template_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "whatsapp"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "whatsapp"."wa_numbers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone_number_id" "text" NOT NULL,
    "display_phone" "text",
    "sector" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "whatsapp"."wa_numbers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."agregados_globales_pedido"
    ADD CONSTRAINT "agregados_globales_pedido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agregados_historial"
    ADD CONSTRAINT "agregados_historial_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agregados"
    ADD CONSTRAINT "agregados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alumnos_responsables"
    ADD CONSTRAINT "alumnos_responsables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."auditoria"
    ADD CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."banderas_pedido"
    ADD CONSTRAINT "banderas_pedido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beneficios_pedido"
    ADD CONSTRAINT "beneficios_pedido_pedido_beneficio_unique" UNIQUE ("id_pedido", "id_beneficio");



ALTER TABLE ONLY "public"."beneficios_pedido"
    ADD CONSTRAINT "beneficios_pedido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beneficios"
    ADD CONSTRAINT "beneficios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_id_grupo_key" UNIQUE ("id_grupo");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_token_activacion_hash_key" UNIQUE ("token_activacion_hash");



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_usuario_key" UNIQUE ("usuario");



ALTER TABLE ONLY "public"."colegios"
    ADD CONSTRAINT "colegios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "combos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cuotas"
    ADD CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documentos"
    ADD CONSTRAINT "documentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grupos"
    ADD CONSTRAINT "grupos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grupos"
    ADD CONSTRAINT "grupos_unicos" UNIQUE ("id_colegio", "nivel", "turno", "orientacion", "promo");



ALTER TABLE ONLY "public"."movimientos_caja"
    ADD CONSTRAINT "movimientos_caja_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."muestras_fisicas"
    ADD CONSTRAINT "muestras_fisicas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notificaciones_whatsapp"
    ADD CONSTRAINT "notificaciones_whatsapp_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."padres_responsables"
    ADD CONSTRAINT "padres_responsables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pedidos_envio"
    ADD CONSTRAINT "pedidos_envio_id_pedido_key" UNIQUE ("id_pedido");



ALTER TABLE ONLY "public"."pedidos_envio"
    ADD CONSTRAINT "pedidos_envio_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "pedidos_nro_fabrica_key" UNIQUE ("nro_fabrica");



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permisos"
    ADD CONSTRAINT "permisos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."precios_productos_historial"
    ADD CONSTRAINT "precios_productos_historial_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."precios_productos"
    ADD CONSTRAINT "precios_productos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."precios_productos"
    ADD CONSTRAINT "precios_productos_unico" UNIQUE ("id_producto", "cuotas", "con_senia", "cantidad_desde");



ALTER TABLE ONLY "public"."prendas_pedido"
    ADD CONSTRAINT "prendas_pedido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."producto_componentes"
    ADD CONSTRAINT "producto_componentes_combo_componente_unique" UNIQUE ("id_producto_combo", "id_producto_componente");



ALTER TABLE ONLY "public"."producto_componentes"
    ADD CONSTRAINT "producto_componentes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos_pedidos"
    ADD CONSTRAINT "productos_pedidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles_permisos"
    ADD CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("nombre_rol");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_rol_key" UNIQUE ("rol");



ALTER TABLE ONLY "public"."sesiones_clientes"
    ADD CONSTRAINT "sesiones_clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sesiones_clientes"
    ADD CONSTRAINT "sesiones_clientes_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "whatsapp"."chat_tags"
    ADD CONSTRAINT "chat_tags_normalized_name_key" UNIQUE ("normalized_name");



ALTER TABLE ONLY "whatsapp"."chat_tags"
    ADD CONSTRAINT "chat_tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "whatsapp"."contacts"
    ADD CONSTRAINT "contacts_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "whatsapp"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "whatsapp"."conversation_tags"
    ADD CONSTRAINT "conversation_tags_pkey" PRIMARY KEY ("conversation_id", "tag_id");



ALTER TABLE ONLY "whatsapp"."conversations"
    ADD CONSTRAINT "conversations_contact_id_phone_number_id_key" UNIQUE ("contact_id", "phone_number_id");



ALTER TABLE ONLY "whatsapp"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "whatsapp"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "whatsapp"."messages"
    ADD CONSTRAINT "messages_wamid_key" UNIQUE ("wamid");



ALTER TABLE ONLY "whatsapp"."templates"
    ADD CONSTRAINT "templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "whatsapp"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "whatsapp"."wa_numbers"
    ADD CONSTRAINT "wa_numbers_phone_number_id_key" UNIQUE ("phone_number_id");



ALTER TABLE ONLY "whatsapp"."wa_numbers"
    ADD CONSTRAINT "wa_numbers_pkey" PRIMARY KEY ("id");



CREATE INDEX "agregados_globales_pedido_id_pedido_idx" ON "public"."agregados_globales_pedido" USING "btree" ("id_pedido");



CREATE INDEX "agregados_historial_busqueda_idx" ON "public"."agregados_historial" USING "btree" ("id_agregado", "vigente_desde" DESC);



CREATE INDEX "auditoria_created_at_idx" ON "public"."auditoria" USING "btree" ("created_at" DESC);



CREATE INDEX "auditoria_id_pedido_idx" ON "public"."auditoria" USING "btree" ("id_pedido");



CREATE INDEX "banderas_pedido_id_disenadora_idx" ON "public"."banderas_pedido" USING "btree" ("id_disenadora");



CREATE INDEX "banderas_pedido_id_pedido_idx" ON "public"."banderas_pedido" USING "btree" ("id_pedido");



CREATE INDEX "colegios_localidad_trgm_idx" ON "public"."colegios" USING "gin" ("localidad" "extensions"."gin_trgm_ops");



CREATE INDEX "colegios_nombre_trgm_idx" ON "public"."colegios" USING "gin" ("nombre" "extensions"."gin_trgm_ops");



CREATE INDEX "grupos_created_at_idx" ON "public"."grupos" USING "btree" ("created_at");



CREATE INDEX "grupos_promo_idx" ON "public"."grupos" USING "btree" ("promo");



CREATE INDEX "idx_alumnos_responsables_id_grupo" ON "public"."alumnos_responsables" USING "btree" ("id_grupo");



CREATE INDEX "idx_beneficios_pedido_id_pedido" ON "public"."beneficios_pedido" USING "btree" ("id_pedido");



CREATE INDEX "idx_colegios_nombre_localidad" ON "public"."colegios" USING "btree" ("nombre", "localidad");



CREATE INDEX "idx_contratos_grupo" ON "public"."contratos" USING "btree" ("grupo");



CREATE INDEX "idx_cuotas_id_pedido" ON "public"."cuotas" USING "btree" ("id_pedido");



CREATE INDEX "idx_documentos_id_grupo" ON "public"."documentos" USING "btree" ("id_grupo");



CREATE INDEX "idx_grupos_id_colegio" ON "public"."grupos" USING "btree" ("id_colegio");



CREATE INDEX "idx_padres_responsables_id_grupo" ON "public"."padres_responsables" USING "btree" ("id_grupo");



CREATE INDEX "idx_pagos_banco_created_at" ON "public"."pagos" USING "btree" ("banco", "created_at" DESC);



CREATE INDEX "idx_pagos_id_documento" ON "public"."pagos" USING "btree" ("id_documento");



CREATE INDEX "idx_pagos_id_pedido" ON "public"."pagos" USING "btree" ("id_pedido");



CREATE INDEX "idx_pedidos_estado_general" ON "public"."pedidos" USING "btree" ("estado_general");



CREATE INDEX "idx_pedidos_id_grupo" ON "public"."pedidos" USING "btree" ("id_grupo");



CREATE INDEX "idx_precios_productos_id_producto" ON "public"."precios_productos" USING "btree" ("id_producto");



CREATE INDEX "idx_prendas_pedido_pedido" ON "public"."prendas_pedido" USING "btree" ("id_pedido");



CREATE INDEX "idx_prendas_pedido_producto_pedido" ON "public"."prendas_pedido" USING "btree" ("id_producto_pedido");



CREATE INDEX "idx_producto_componentes_combo" ON "public"."producto_componentes" USING "btree" ("id_producto_combo");



CREATE INDEX "idx_productos_pedidos_id_pedido" ON "public"."productos_pedidos" USING "btree" ("id_pedido");



CREATE INDEX "muestras_fisicas_id_pedido_idx" ON "public"."muestras_fisicas" USING "btree" ("id_pedido");



CREATE INDEX "notificaciones_whatsapp_id_pedido_idx" ON "public"."notificaciones_whatsapp" USING "btree" ("id_pedido");



CREATE INDEX "notificaciones_whatsapp_pendientes_idx" ON "public"."notificaciones_whatsapp" USING "btree" ("estado", "plantilla", "fecha_programada");



CREATE INDEX "pagos_banco_fecha_idx" ON "public"."pagos" USING "btree" ("banco", "fecha");



CREATE INDEX "pedidos_envio_id_comprobante_idx" ON "public"."pedidos_envio" USING "btree" ("id_comprobante");



CREATE INDEX "pedidos_envio_id_movimiento_caja_idx" ON "public"."pedidos_envio" USING "btree" ("id_movimiento_caja");



CREATE INDEX "pedidos_envio_pendientes_idx" ON "public"."pedidos_envio" USING "btree" ("forma_entrega") WHERE (NOT "entregado");



CREATE INDEX "pedidos_fecha_entrega_aproximada_idx" ON "public"."pedidos" USING "btree" ("fecha_entrega_aproximada");



CREATE INDEX "precios_productos_historial_busqueda_idx" ON "public"."precios_productos_historial" USING "btree" ("id_producto", "id_precio_producto", "vigente_desde" DESC);



CREATE INDEX "sesiones_clientes_id_cliente_idx" ON "public"."sesiones_clientes" USING "btree" ("id_cliente");



CREATE INDEX "sesiones_clientes_token_hash_idx" ON "public"."sesiones_clientes" USING "btree" ("token_hash");



CREATE INDEX "idx_conversation_tags_conv" ON "whatsapp"."conversation_tags" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_tags_tag" ON "whatsapp"."conversation_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_conversations_contact" ON "whatsapp"."conversations" USING "btree" ("contact_id");



CREATE INDEX "idx_conversations_number" ON "whatsapp"."conversations" USING "btree" ("phone_number_id");



CREATE INDEX "idx_conversations_updated" ON "whatsapp"."conversations" USING "btree" ("last_message_at" DESC NULLS LAST);



CREATE INDEX "idx_messages_conversation" ON "whatsapp"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created" ON "whatsapp"."messages" USING "btree" ("created_at");



CREATE OR REPLACE TRIGGER "trg_asignar_nro_fabrica" BEFORE UPDATE OF "estado_general" ON "public"."pedidos" FOR EACH ROW EXECUTE FUNCTION "public"."asignar_nro_fabrica_trigger"();



CREATE OR REPLACE TRIGGER "trg_cancelar_recordatorio_contrato" AFTER INSERT OR UPDATE OF "firmado" ON "public"."contratos" FOR EACH ROW WHEN (("new"."firmado" IS TRUE)) EXECUTE FUNCTION "public"."cancelar_recordatorio_contrato_trigger"();



CREATE OR REPLACE TRIGGER "trg_historial_agregados" AFTER INSERT OR UPDATE ON "public"."agregados" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_historial_agregado"();



CREATE OR REPLACE TRIGGER "trg_historial_precios_productos" AFTER INSERT OR UPDATE ON "public"."precios_productos" FOR EACH ROW EXECUTE FUNCTION "public"."registrar_historial_precio_producto"();



CREATE OR REPLACE TRIGGER "trg_marcar_pedido_listo_produccion" BEFORE UPDATE OF "fecha_aprobacion_boceto", "estado_talles" ON "public"."pedidos" FOR EACH ROW EXECUTE FUNCTION "public"."marcar_pedido_listo_produccion_trigger"();



CREATE OR REPLACE TRIGGER "trg_programar_recordatorio_contrato" AFTER UPDATE OF "fecha_entrega_aproximada" ON "public"."pedidos" FOR EACH ROW WHEN ((("old"."fecha_entrega_aproximada" IS NULL) AND ("new"."fecha_entrega_aproximada" IS NOT NULL))) EXECUTE FUNCTION "public"."programar_recordatorio_contrato_trigger"();



ALTER TABLE ONLY "public"."agregados_globales_pedido"
    ADD CONSTRAINT "agregados_globales_pedido_id_agregado_fkey" FOREIGN KEY ("id_agregado") REFERENCES "public"."agregados"("id");



ALTER TABLE ONLY "public"."agregados_globales_pedido"
    ADD CONSTRAINT "agregados_globales_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."alumnos_responsables"
    ADD CONSTRAINT "alumnos_responsables_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."auditoria"
    ADD CONSTRAINT "auditoria_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "public"."clientes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."auditoria"
    ADD CONSTRAINT "auditoria_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."auditoria"
    ADD CONSTRAINT "auditoria_usuario_fkey" FOREIGN KEY ("usuario") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."banderas_pedido"
    ADD CONSTRAINT "banderas_pedido_id_disenadora_fkey" FOREIGN KEY ("id_disenadora") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."banderas_pedido"
    ADD CONSTRAINT "banderas_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."beneficios"
    ADD CONSTRAINT "beneficios_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."beneficios_pedido"
    ADD CONSTRAINT "beneficios_pedido_id_beneficio_fkey" FOREIGN KEY ("id_beneficio") REFERENCES "public"."beneficios"("id");



ALTER TABLE ONLY "public"."beneficios_pedido"
    ADD CONSTRAINT "beneficios_pedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_grupo_fkey" FOREIGN KEY ("grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."cuotas"
    ADD CONSTRAINT "cuotas_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."documentos"
    ADD CONSTRAINT "documentos_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."padres_responsables"
    ADD CONSTRAINT "fk_firma" FOREIGN KEY ("firma") REFERENCES "public"."documentos"("id");



ALTER TABLE ONLY "public"."grupos"
    ADD CONSTRAINT "grupos_colegio_fkey" FOREIGN KEY ("id_colegio") REFERENCES "public"."colegios"("id");



ALTER TABLE ONLY "public"."movimientos_caja"
    ADD CONSTRAINT "movimientos_caja_usuario_fkey" FOREIGN KEY ("usuario") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."muestras_fisicas"
    ADD CONSTRAINT "muestras_fisicas_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."notificaciones_whatsapp"
    ADD CONSTRAINT "notificaciones_whatsapp_id_cuota_fkey" FOREIGN KEY ("id_cuota") REFERENCES "public"."cuotas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notificaciones_whatsapp"
    ADD CONSTRAINT "notificaciones_whatsapp_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."padres_responsables"
    ADD CONSTRAINT "padres_responsables_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "public"."documentos"("id");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."pedidos_envio"
    ADD CONSTRAINT "pedidos_envio_id_comprobante_fkey" FOREIGN KEY ("id_comprobante") REFERENCES "public"."documentos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pedidos_envio"
    ADD CONSTRAINT "pedidos_envio_id_movimiento_caja_fkey" FOREIGN KEY ("id_movimiento_caja") REFERENCES "public"."movimientos_caja"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pedidos_envio"
    ADD CONSTRAINT "pedidos_envio_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "pedidos_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "pedidos_id_vendedora_fkey" FOREIGN KEY ("id_vendedora") REFERENCES "public"."usuarios"("id");



ALTER TABLE ONLY "public"."precios_productos"
    ADD CONSTRAINT "precios_productos_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."prendas_pedido"
    ADD CONSTRAINT "prendas_pedido_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."prendas_pedido"
    ADD CONSTRAINT "prendas_pedido_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."prendas_pedido"
    ADD CONSTRAINT "prendas_pedido_producto_pedido_fkey" FOREIGN KEY ("id_producto_pedido") REFERENCES "public"."productos_pedidos"("id");



ALTER TABLE ONLY "public"."producto_componentes"
    ADD CONSTRAINT "producto_componentes_combo_fkey" FOREIGN KEY ("id_producto_combo") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."producto_componentes"
    ADD CONSTRAINT "producto_componentes_componente_fkey" FOREIGN KEY ("id_producto_componente") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."productos_pedidos"
    ADD CONSTRAINT "productos_pedidos_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."productos_pedidos"
    ADD CONSTRAINT "productos_pedidos_id_producto_original_fkey" FOREIGN KEY ("id_producto_original") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."roles_permisos"
    ADD CONSTRAINT "roles_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id");



ALTER TABLE ONLY "public"."roles_permisos"
    ADD CONSTRAINT "roles_permisos_rol_nro_fkey" FOREIGN KEY ("rol_nro") REFERENCES "public"."roles"("rol");



ALTER TABLE ONLY "public"."sesiones_clientes"
    ADD CONSTRAINT "sesiones_clientes_id_cliente_fkey" FOREIGN KEY ("id_cliente") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_auth_fkey" FOREIGN KEY ("id_auth") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_rol_fkey" FOREIGN KEY ("rol") REFERENCES "public"."roles"("rol");



ALTER TABLE ONLY "whatsapp"."chat_tags"
    ADD CONSTRAINT "chat_tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "whatsapp"."conversation_tags"
    ADD CONSTRAINT "conversation_tags_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "whatsapp"."conversation_tags"
    ADD CONSTRAINT "conversation_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "whatsapp"."chat_tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "whatsapp"."conversations"
    ADD CONSTRAINT "conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "whatsapp"."contacts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "whatsapp"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp"."conversations"("id") ON DELETE CASCADE;



CREATE POLICY "Usuarios pueden ver su propia fila" ON "public"."usuarios" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id_auth"));



ALTER TABLE "public"."agregados" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agregados_globales_pedido" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agregados_historial" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alumnos_responsables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."auditoria" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."banderas_pedido" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beneficios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."beneficios_pedido" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."colegios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contratos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cuotas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grupos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."movimientos_caja" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muestras_fisicas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notificaciones_whatsapp" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."padres_responsables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pedidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pedidos_envio" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permisos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."precios_productos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."precios_productos_historial" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prendas_pedido" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."producto_componentes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."productos_pedidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles_permisos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sesiones_clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "whatsapp"."chat_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "whatsapp"."contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "whatsapp"."conversation_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "whatsapp"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "whatsapp"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "whatsapp"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "whatsapp"."wa_numbers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wpp_auth_all_chat_tags" ON "whatsapp"."chat_tags" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "wpp_auth_all_contacts" ON "whatsapp"."contacts" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "wpp_auth_all_conversation_tags" ON "whatsapp"."conversation_tags" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "wpp_auth_all_conversations" ON "whatsapp"."conversations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "wpp_auth_all_messages" ON "whatsapp"."messages" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "wpp_auth_all_templates" ON "whatsapp"."templates" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "wpp_auth_all_wa_numbers" ON "whatsapp"."wa_numbers" TO "authenticated" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "whatsapp"."chat_tags";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "whatsapp"."conversation_tags";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "whatsapp"."conversations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "whatsapp"."messages";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "whatsapp" TO "authenticated";
GRANT USAGE ON SCHEMA "whatsapp" TO "service_role";








































































































































































































































































GRANT ALL ON FUNCTION "public"."agregados_en_fecha"("p_fecha" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."asignar_nro_fabrica_trigger"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."asignar_nro_fabrica_trigger"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."beneficios_tramo_en_fecha"("p_id_producto" bigint, "p_cantidad" integer, "p_fecha" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."beneficios_tramo_en_fecha"("p_id_producto" bigint, "p_cantidad" integer, "p_fecha" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancelar_recordatorio_contrato_trigger"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancelar_recordatorio_contrato_trigger"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."crear_pedido_completo"("payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."crear_pedido_completo"("payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."eliminar_pago_completo"("p_id_pago" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."eliminar_pago_completo"("p_id_pago" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."enviar_pedido_a_fabrica"("p_id_pedido" bigint, "p_mes" integer, "p_anio" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enviar_pedido_a_fabrica"("p_id_pedido" bigint, "p_mes" integer, "p_anio" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."generar_banderas_pedido"("p_id_pedido" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generar_banderas_pedido"("p_id_pedido" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."marcar_pedido_listo_produccion_trigger"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."marcar_pedido_listo_produccion_trigger"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."modificar_beneficios_pedido"("p_id_pedido" bigint, "p_beneficios" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."modificar_beneficios_pedido"("p_id_pedido" bigint, "p_beneficios" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."modificar_beneficios_producto"("p_id_producto" bigint, "p_tramos" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."modificar_beneficios_producto"("p_id_producto" bigint, "p_tramos" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."modificar_plan_pedido"("payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."modificar_plan_pedido"("payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."modificar_plan_y_beneficios_pedido"("payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."modificar_plan_y_beneficios_pedido"("payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."modificar_precios_producto"("p_id_producto" bigint, "p_precios" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."modificar_precios_producto"("p_id_producto" bigint, "p_precios" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."precio_agregado_en_fecha"("p_id_agregado" bigint, "p_fecha" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."precio_producto_en_fecha"("p_id_producto" bigint, "p_cuotas" integer, "p_cantidad" integer, "p_fecha" timestamp with time zone, "p_con_senia" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."programar_recordatorio_contrato_trigger"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."programar_recordatorio_contrato_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_historial_agregado"() TO "service_role";



GRANT ALL ON FUNCTION "public"."registrar_historial_precio_producto"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."registrar_pago_completo"("p_pago" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."registrar_pago_completo"("p_pago" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sumar_movimientos_caja"("p_tipo" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sumar_movimientos_caja"("p_tipo" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sumar_pagos"("p_bancos" "text"[], "p_excluir_bancos" "text"[], "p_desde" "date", "p_hasta" "date", "p_excluir_devolucion" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sumar_pagos"("p_bancos" "text"[], "p_excluir_bancos" "text"[], "p_desde" "date", "p_hasta" "date", "p_excluir_devolucion" boolean) TO "service_role";
























GRANT ALL ON TABLE "public"."agregados" TO "anon";
GRANT ALL ON TABLE "public"."agregados" TO "authenticated";
GRANT ALL ON TABLE "public"."agregados" TO "service_role";



GRANT ALL ON TABLE "public"."agregados_globales_pedido" TO "anon";
GRANT ALL ON TABLE "public"."agregados_globales_pedido" TO "authenticated";
GRANT ALL ON TABLE "public"."agregados_globales_pedido" TO "service_role";



GRANT ALL ON SEQUENCE "public"."agregados_globales_pedido_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agregados_globales_pedido_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agregados_globales_pedido_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."agregados_historial" TO "anon";
GRANT ALL ON TABLE "public"."agregados_historial" TO "authenticated";
GRANT ALL ON TABLE "public"."agregados_historial" TO "service_role";



GRANT ALL ON SEQUENCE "public"."agregados_historial_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agregados_historial_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agregados_historial_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."agregados_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agregados_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agregados_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."alumnos_responsables" TO "anon";
GRANT ALL ON TABLE "public"."alumnos_responsables" TO "authenticated";
GRANT ALL ON TABLE "public"."alumnos_responsables" TO "service_role";



GRANT ALL ON SEQUENCE "public"."alumnos_responsables_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."alumnos_responsables_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."alumnos_responsables_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."auditoria" TO "anon";
GRANT ALL ON TABLE "public"."auditoria" TO "authenticated";
GRANT ALL ON TABLE "public"."auditoria" TO "service_role";



GRANT ALL ON SEQUENCE "public"."auditoria_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."auditoria_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."auditoria_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."banderas_pedido" TO "anon";
GRANT ALL ON TABLE "public"."banderas_pedido" TO "authenticated";
GRANT ALL ON TABLE "public"."banderas_pedido" TO "service_role";



GRANT ALL ON SEQUENCE "public"."banderas_pedido_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."banderas_pedido_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."banderas_pedido_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."beneficios" TO "anon";
GRANT ALL ON TABLE "public"."beneficios" TO "authenticated";
GRANT ALL ON TABLE "public"."beneficios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."beneficios_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."beneficios_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."beneficios_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."beneficios_pedido" TO "anon";
GRANT ALL ON TABLE "public"."beneficios_pedido" TO "authenticated";
GRANT ALL ON TABLE "public"."beneficios_pedido" TO "service_role";



GRANT ALL ON SEQUENCE "public"."beneficios_pedido_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."beneficios_pedido_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."beneficios_pedido_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."clientes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."clientes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."clientes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."colegios" TO "anon";
GRANT ALL ON TABLE "public"."colegios" TO "authenticated";
GRANT ALL ON TABLE "public"."colegios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."colegios_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."colegios_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."colegios_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."productos" TO "anon";
GRANT ALL ON TABLE "public"."productos" TO "authenticated";
GRANT ALL ON TABLE "public"."productos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."combos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."combos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."combos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contratos" TO "anon";
GRANT ALL ON TABLE "public"."contratos" TO "authenticated";
GRANT ALL ON TABLE "public"."contratos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contratos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contratos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contratos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cuotas" TO "anon";
GRANT ALL ON TABLE "public"."cuotas" TO "authenticated";
GRANT ALL ON TABLE "public"."cuotas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cuotas_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cuotas_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cuotas_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."documentos" TO "anon";
GRANT ALL ON TABLE "public"."documentos" TO "authenticated";
GRANT ALL ON TABLE "public"."documentos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."documentos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."documentos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."documentos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."grupos" TO "anon";
GRANT ALL ON TABLE "public"."grupos" TO "authenticated";
GRANT ALL ON TABLE "public"."grupos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."grupos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."grupos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."grupos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."movimientos_caja" TO "anon";
GRANT ALL ON TABLE "public"."movimientos_caja" TO "authenticated";
GRANT ALL ON TABLE "public"."movimientos_caja" TO "service_role";



GRANT ALL ON SEQUENCE "public"."movimientos_caja_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."movimientos_caja_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."movimientos_caja_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."muestras_fisicas" TO "anon";
GRANT ALL ON TABLE "public"."muestras_fisicas" TO "authenticated";
GRANT ALL ON TABLE "public"."muestras_fisicas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."muestras_fisicas_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."muestras_fisicas_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."muestras_fisicas_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notificaciones_whatsapp" TO "anon";
GRANT ALL ON TABLE "public"."notificaciones_whatsapp" TO "authenticated";
GRANT ALL ON TABLE "public"."notificaciones_whatsapp" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notificaciones_whatsapp_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notificaciones_whatsapp_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notificaciones_whatsapp_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."nro_pedido_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nro_pedido_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nro_pedido_seq" TO "service_role";



GRANT ALL ON TABLE "public"."padres_responsables" TO "anon";
GRANT ALL ON TABLE "public"."padres_responsables" TO "authenticated";
GRANT ALL ON TABLE "public"."padres_responsables" TO "service_role";



GRANT ALL ON SEQUENCE "public"."padres_responsables_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."padres_responsables_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."padres_responsables_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pagos" TO "anon";
GRANT ALL ON TABLE "public"."pagos" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos" TO "service_role";



GRANT ALL ON TABLE "public"."pedidos" TO "anon";
GRANT ALL ON TABLE "public"."pedidos" TO "authenticated";
GRANT ALL ON TABLE "public"."pedidos" TO "service_role";



GRANT ALL ON TABLE "public"."pagos_banco" TO "anon";
GRANT ALL ON TABLE "public"."pagos_banco" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos_banco" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pagos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pagos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pagos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pedidos_envio" TO "anon";
GRANT ALL ON TABLE "public"."pedidos_envio" TO "authenticated";
GRANT ALL ON TABLE "public"."pedidos_envio" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pedidos_envio_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pedidos_envio_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pedidos_envio_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pedidos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pedidos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pedidos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."permisos" TO "anon";
GRANT ALL ON TABLE "public"."permisos" TO "authenticated";
GRANT ALL ON TABLE "public"."permisos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."permisos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."permisos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."permisos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."precios_productos" TO "anon";
GRANT ALL ON TABLE "public"."precios_productos" TO "authenticated";
GRANT ALL ON TABLE "public"."precios_productos" TO "service_role";



GRANT ALL ON TABLE "public"."precios_productos_historial" TO "anon";
GRANT ALL ON TABLE "public"."precios_productos_historial" TO "authenticated";
GRANT ALL ON TABLE "public"."precios_productos_historial" TO "service_role";



GRANT ALL ON SEQUENCE "public"."precios_productos_historial_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."precios_productos_historial_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."precios_productos_historial_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."precios_productos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."precios_productos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."precios_productos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."prendas_pedido" TO "anon";
GRANT ALL ON TABLE "public"."prendas_pedido" TO "authenticated";
GRANT ALL ON TABLE "public"."prendas_pedido" TO "service_role";



GRANT ALL ON SEQUENCE "public"."prendas_pedido_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prendas_pedido_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prendas_pedido_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."producto_componentes" TO "anon";
GRANT ALL ON TABLE "public"."producto_componentes" TO "authenticated";
GRANT ALL ON TABLE "public"."producto_componentes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."producto_componentes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."producto_componentes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."producto_componentes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."productos_pedidos" TO "anon";
GRANT ALL ON TABLE "public"."productos_pedidos" TO "authenticated";
GRANT ALL ON TABLE "public"."productos_pedidos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."productos_pedidos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."productos_pedidos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."productos_pedidos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."roles_permisos" TO "anon";
GRANT ALL ON TABLE "public"."roles_permisos" TO "authenticated";
GRANT ALL ON TABLE "public"."roles_permisos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."roles_permisos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_permisos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_permisos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sesiones_clientes" TO "anon";
GRANT ALL ON TABLE "public"."sesiones_clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."sesiones_clientes" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."usuarios_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."usuarios_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."usuarios_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vista_caja" TO "anon";
GRANT ALL ON TABLE "public"."vista_caja" TO "authenticated";
GRANT ALL ON TABLE "public"."vista_caja" TO "service_role";









GRANT ALL ON TABLE "whatsapp"."chat_tags" TO "authenticated";
GRANT ALL ON TABLE "whatsapp"."chat_tags" TO "service_role";



GRANT ALL ON TABLE "whatsapp"."contacts" TO "authenticated";
GRANT ALL ON TABLE "whatsapp"."contacts" TO "service_role";



GRANT ALL ON TABLE "whatsapp"."conversation_tags" TO "authenticated";
GRANT ALL ON TABLE "whatsapp"."conversation_tags" TO "service_role";



GRANT ALL ON TABLE "whatsapp"."conversations" TO "authenticated";
GRANT ALL ON TABLE "whatsapp"."conversations" TO "service_role";



GRANT ALL ON TABLE "whatsapp"."messages" TO "authenticated";
GRANT ALL ON TABLE "whatsapp"."messages" TO "service_role";



GRANT ALL ON TABLE "whatsapp"."templates" TO "authenticated";
GRANT ALL ON TABLE "whatsapp"."templates" TO "service_role";



GRANT ALL ON TABLE "whatsapp"."wa_numbers" TO "authenticated";
GRANT ALL ON TABLE "whatsapp"."wa_numbers" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "whatsapp" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "whatsapp" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "whatsapp" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "whatsapp" GRANT ALL ON TABLES TO "service_role";






























-- Agregado a mano: el esquema "whatsapp" era del wpp-dashboard, que ya no se usa. En producción no hace falta.
-- (La tabla public.notificaciones_whatsapp se deja porque la usan funciones y triggers del sistema.)
DROP SCHEMA IF EXISTS "whatsapp" CASCADE;
