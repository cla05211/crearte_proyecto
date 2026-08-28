-- La bandera (y cualquier otro agregado no individual) dejó de guardarse como
-- texto dentro de productos_pedidos.descripcion: ahora se guarda como fila en
-- agregados_globales_pedido (creada en 20260828180000_crear_agregados_globales_pedido.sql).
-- Esta migración extiende crear_pedido_completo y modificar_plan_pedido para
-- que inserten ahí, con la misma filosofía atómica del resto de la función
-- (todo o nada, rollback automático si algo falla en el medio).
--
-- crear_pedido_completo: se le suma un array nuevo al payload,
-- 'agregadosGlobalesDTO' -> [{ "id_agregado": 5 }, ...] (coalesce a [] para
-- que siga funcionando si algún caller viejo no lo manda).
--
-- modificar_plan_pedido: mismo patrón que ya usa para productos_pedidos —
-- borra todo lo que había para el pedido y lo vuelve a insertar de cero.
-- Nuevo campo del payload: 'agregadosGlobales' -> [{ "id_agregado": 5 }, ...].

create or replace function public.crear_pedido_completo(payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  id_colegio      bigint;
  id_grupo        bigint;
  id_pedido       bigint;
  id_pago         bigint;
  id_documento    bigint;
  producto        jsonb;
  padre           jsonb;
  alumno          jsonb;
  documento       jsonb;
  pago            jsonb;
  agregado_global jsonb;
  nro_cuotas      int;
  fecha_primera   date;
  importe_cuota   double precision;
  numero_primera  int;
  dia_original    int;
  fecha_mes_base  date;
  ultimo_dia_mes  int;
  fecha_calculada date;
  i               int;
begin
  -- Colegio (con deduplicación por nombre + localidad, igual que crearColegio())
  select id into id_colegio
  from colegios
  where nombre = payload->'colegioDTO'->>'nombre'
    and localidad = payload->'colegioDTO'->>'localidad'
  limit 1;

  if id_colegio is null then
    insert into colegios (nombre, localidad, provincia)
    values (
      payload->'colegioDTO'->>'nombre',
      payload->'colegioDTO'->>'localidad',
      payload->'colegioDTO'->>'provincia'
    )
    returning id into id_colegio;
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

  -- Pedido
  insert into pedidos (
    id_grupo, talles, envio_gratis, observaciones, estado_general,
    fecha_aprobacion_boceto, fecha_aprobacion_talles, colores,molderias,
    cantidad_hermanos, porcentaje_descuento_hermanos, id_vendedora,
    estado_boceto, estado_talles, id_disenadora
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
    (payload->'pedidoDTO'->>'id_disenadora')::bigint
  )
  returning id into id_pedido;

  -- Productos del pedido
  for producto in select * from jsonb_array_elements(payload->'productosPedidoDTO')
  loop
    insert into productos_pedidos (
      id_pedido, id_producto_original, cantidad, descripcion, valor_senia, valor_cuota, beneficio
    )
    values (
      id_pedido,
      (producto->>'id_producto_original')::bigint,
      (producto->>'cantidad')::int,
      producto->>'descripcion',
      (producto->>'valor_senia')::real,
      (producto->>'valor_cuota')::real,
      producto->>'beneficio'
    );
  end loop;

  -- Agregados globales del pedido (ej. bandera): no van en la descripción de
  -- ningún producto puntual, se asocian directo al pedido.
  for agregado_global in select * from jsonb_array_elements(coalesce(payload->'agregadosGlobalesDTO', '[]'::jsonb))
  loop
    insert into agregados_globales_pedido (id_pedido, id_agregado)
    values (id_pedido, (agregado_global->>'id_agregado')::bigint);
  end loop;

  -- Padres responsables
  for padre in select * from jsonb_array_elements(payload->'padresResponsablesDTO')
  loop
    insert into padres_responsables (nombre, apellido, dni, telefono, mail, id_grupo)
    values (
      padre->>'nombre',
      padre->>'apellido',
      padre->>'dni',
      padre->>'telefono',
      padre->>'mail',
      id_grupo
    );
  end loop;

  -- Alumnos responsables
  for alumno in select * from jsonb_array_elements(payload->'alumnosResponsablesDTO')
  loop
    insert into alumnos_responsables (id_grupo, nombre, apellido, telefono)
    values (
      id_grupo,
      alumno->>'nombre',
      alumno->>'apellido',
      alumno->>'telefono'
    );
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

    INSERT INTO pagos (id_pedido, id_documento, nro_transferencia, tipo_pago, monto, motivo, fecha, aprobado, banco, entidad_pago)
    VALUES (
      id_pedido,
      id_documento,
      pago->>'nro_transferencia',
      pago->>'tipo_pago',
      (pago->>'monto')::double precision,
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
  -- replicando CuotasService.acomodarFecha() (mismo día del mes,
  -- clampeado al último día si el mes no lo tiene).
  nro_cuotas     := (payload->>'nroCuotas')::int;
  fecha_primera  := (payload->'primerCuota'->>'fecha_vencimiento')::date;
  importe_cuota  := (payload->'primerCuota'->>'importe')::double precision;
  numero_primera := coalesce((payload->'primerCuota'->>'numero')::int, 1);
  dia_original   := extract(day from fecha_primera);

  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado)
  values (id_pedido, numero_primera, fecha_primera, importe_cuota, 'Pendiente');

  for i in 1..(nro_cuotas - 1) loop
    fecha_mes_base := (date_trunc('month', fecha_primera) + (i || ' months')::interval)::date;
    ultimo_dia_mes := extract(day from (fecha_mes_base + interval '1 month - 1 day'));
    fecha_calculada := fecha_mes_base + (least(dia_original, ultimo_dia_mes) - 1);

    insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado)
    values (id_pedido, numero_primera + i, fecha_calculada, importe_cuota, 'Pendiente');
  end loop;

  return id_pedido;
end;
$$;

create or replace function public.modificar_plan_pedido(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_pedido           bigint;
  v_nueva_cant_cuotas   int;
  v_valor_cuota_nuevo   double precision;
  v_valor_senia_nuevo   double precision;

  producto              jsonb;
  agregado_global       jsonb;

  v_fecha_primera       date;
  v_dia_original        int;
  v_fecha_mes_base      date;
  v_ultimo_dia_mes      int;
  v_fecha_calculada     date;

  v_total_pagado        double precision;
  v_total_plan_nuevo    double precision;
  v_saldo_pendiente     double precision;
  v_cuotas_pagadas      int;
  v_pendientes_count    int;
  v_importe_pendiente   double precision;
  v_importe_cuota       double precision;
  v_estado_cuota        text;

  i                      int;
  v_numero               int;
begin
  v_id_pedido         := (payload->>'id_pedido')::bigint;
  v_nueva_cant_cuotas := (payload->>'nueva_cantidad_cuotas')::int;
  v_valor_cuota_nuevo := (payload->>'valor_cuota_nuevo')::double precision;
  v_valor_senia_nuevo := coalesce((payload->>'valor_senia_nuevo')::double precision, 0);

  if v_id_pedido is null then
    raise exception 'Falta id_pedido en el payload';
  end if;

  if v_nueva_cant_cuotas is null or v_nueva_cant_cuotas <= 0 then
    raise exception 'nueva_cantidad_cuotas debe ser mayor a 0';
  end if;

  if payload->'productos' is null or jsonb_array_length(payload->'productos') = 0 then
    raise exception 'El pedido debe tener al menos un producto';
  end if;

  -- Guardamos la fecha de la cuota 1 actual ANTES de borrar nada:
  -- las nuevas cuotas se anclan a la fecha del acuerdo original, no a hoy.
  select fecha_vencimiento into v_fecha_primera
  from cuotas
  where id_pedido = v_id_pedido and numero = 1;

  if v_fecha_primera is null then
    raise exception 'No se encontró la cuota número 1 del pedido %. No se puede recalcular el plan.', v_id_pedido;
  end if;

  -- ---- Productos: se borran todos y se insertan de cero ----
  delete from productos_pedidos where id_pedido = v_id_pedido;

  for producto in select * from jsonb_array_elements(payload->'productos')
  loop
    insert into productos_pedidos (
      id_pedido, id_producto_original, cantidad, descripcion, valor_senia, valor_cuota, beneficio
    )
    values (
      v_id_pedido,
      (producto->>'id_producto_original')::bigint,
      (producto->>'cantidad')::int,
      producto->>'descripcion',
      (producto->>'valor_senia')::real,
      (producto->>'valor_cuota')::real,
      producto->>'beneficio'
    );
  end loop;

  -- ---- Agregados globales del pedido: se borran todos y se insertan de cero ----
  delete from agregados_globales_pedido where id_pedido = v_id_pedido;

  for agregado_global in select * from jsonb_array_elements(coalesce(payload->'agregadosGlobales', '[]'::jsonb))
  loop
    insert into agregados_globales_pedido (id_pedido, id_agregado)
    values (v_id_pedido, (agregado_global->>'id_agregado')::bigint);
  end loop;

  -- ---- Cuotas: se borran todas y se insertan de cero ----
  delete from cuotas where id_pedido = v_id_pedido;

  -- Plata total que ya entró para este pedido (todos los pagos, sin
  -- importar cómo se etiquetó el motivo en su momento -- no lo tocamos).
  select coalesce(sum(monto), 0) into v_total_pagado
  from pagos
  where id_pedido = v_id_pedido;

  v_total_plan_nuevo := v_valor_senia_nuevo + (v_nueva_cant_cuotas * v_valor_cuota_nuevo);
  v_saldo_pendiente  := v_total_plan_nuevo - v_total_pagado;

  -- Si lo que ya pagaron supera el total del plan nuevo, no lo resolvemos
  -- solos (¿se acredita en cuenta corriente? ¿se devuelve?) -- frenamos y
  -- que se decida a mano. Esto hace rollback de todo lo insertado arriba.
  if v_saldo_pendiente < 0 then
    raise exception 'El pago ya realizado ($%) supera el total del nuevo plan ($%). Hay un saldo a favor de $% que debe resolverse manualmente.', v_total_pagado, v_total_plan_nuevo, abs(v_saldo_pendiente);
  end if;

  -- Cuántas cuotas quedan totalmente cubiertas con la plata que ya entró
  -- (descontando la seña del plan nuevo). Esto solo determina CUÁNTAS se
  -- marcan 'Pagada' -- no cuánto se cobra en cada una de las pendientes.
  v_cuotas_pagadas := least(
    floor(greatest(v_total_pagado - v_valor_senia_nuevo, 0) / v_valor_cuota_nuevo)::int,
    v_nueva_cant_cuotas
  );

  v_pendientes_count := v_nueva_cant_cuotas - v_cuotas_pagadas;

  -- El saldo pendiente se reparte EN PARTES IGUALES entre todas las
  -- cuotas pendientes -- así, si el total sube porque se agregó un
  -- producto, el faltante se diluye entre todas y no se concentra en
  -- una sola cuota "bisagra".
  if v_pendientes_count > 0 then
    v_importe_pendiente := v_saldo_pendiente / v_pendientes_count;
  else
    v_importe_pendiente := 0;
  end if;

  v_dia_original := extract(day from v_fecha_primera);

  for i in 0..(v_nueva_cant_cuotas - 1) loop
    v_numero := i + 1;

    if i = 0 then
      v_fecha_calculada := v_fecha_primera;
    else
      v_fecha_mes_base  := (date_trunc('month', v_fecha_primera) + (i || ' months')::interval)::date;
      v_ultimo_dia_mes  := extract(day from (v_fecha_mes_base + interval '1 month - 1 day'));
      v_fecha_calculada := v_fecha_mes_base + (least(v_dia_original, v_ultimo_dia_mes) - 1);
    end if;

    if v_numero <= v_cuotas_pagadas then
      v_estado_cuota  := 'Pagada';
      v_importe_cuota := v_valor_cuota_nuevo;
    else
      v_estado_cuota  := 'Pendiente';
      v_importe_cuota := v_importe_pendiente;
    end if;

    insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado)
    values (v_id_pedido, v_numero, v_fecha_calculada, v_importe_cuota, v_estado_cuota);
  end loop;

  return jsonb_build_object(
    'id_pedido', v_id_pedido,
    'cuotas_pagadas', v_cuotas_pagadas,
    'cuotas_pendientes', v_nueva_cant_cuotas - v_cuotas_pagadas,
    'total_pagado', v_total_pagado
  );
end;
$$;
