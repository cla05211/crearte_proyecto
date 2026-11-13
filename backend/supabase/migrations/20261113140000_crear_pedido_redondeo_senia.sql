-- crear_pedido_completo:
--   * Redondea los importes de las cuotas a centavos (antes quedaban como 685006.6666…); la última absorbe el redondeo.
--     modificar_plan_pedido ya redondeaba.
--   * Guarda la seña acordada (pedidoDTO.senia_total). En los planes de cuotas iguales la bandera también se reparte
--     en la seña, y esa parte no está en los productos: sin esto la seña quedaba corta.
-- El resto queda igual que en 20261113120000_agregados_precio_guardado.sql.

create or replace function public.crear_pedido_completo(payload jsonb)
returns jsonb
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
    round((payload->'pedidoDTO'->>'senia_total')::numeric, 2)
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
  -- Importes redondeados a centavos; la última cuota absorbe la diferencia del redondeo
  importe_cuota  := round((payload->'primerCuota'->>'importe')::numeric, 2);
  importe_ultima := round((payload->'primerCuota'->>'importe')::numeric * nro_cuotas - importe_cuota * (nro_cuotas - 1), 2);
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
