-- Se elimina la columna tipo_pago de pagos: no se usaba para nada (ni
-- filtros, ni reportes, ni UI), solo se guardaba un 'Seña' fijo o lo que
-- viniera del payload. Se actualizan las dos funciones que insertan en
-- pagos para dejar de referenciarla.

alter table public.pagos drop column if exists tipo_pago;

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

    INSERT INTO pagos (id_pedido, id_documento, nro_transferencia, monto, motivo, fecha, aprobado, banco, entidad_pago)
    VALUES (
      id_pedido,
      id_documento,
      pago->>'nro_transferencia',
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

create or replace function public.registrar_pago_completo(
  p_pago jsonb
)
returns integer
language plpgsql
as $$
declare
  v_id_pago integer;
  v_id_pedido integer;
  v_monto numeric;
  v_motivo text;
  v_restante numeric;
  v_falta_cuota numeric;
  cuota record;
begin
  v_id_pedido := (p_pago->>'id_pedido')::integer;
  v_monto := (p_pago->>'monto')::numeric;
  v_motivo := p_pago->>'motivo';

  insert into pagos (
    id_pedido, nro_transferencia, monto, motivo, fecha, aprobado, banco, entidad_pago, id_documento
  )
  values (
    v_id_pedido,
    p_pago->>'nro_transferencia',
    v_monto,
    v_motivo,
    (p_pago->>'fecha')::date,
    (p_pago->>'aprobado')::boolean,
    p_pago->>'banco',
    p_pago->>'entidad_pago',
    (p_pago->>'id_documento')::bigint
  )
  returning id into v_id_pago;

  if v_motivo != 'Seña' then
    v_restante := v_monto;

    for cuota in
      select * from cuotas
      where id_pedido = v_id_pedido
        and estado in ('Pendiente', 'Parcial', 'Adeudada')
      order by numero asc
    loop
      exit when v_restante <= 0;

      v_falta_cuota := cuota.importe - coalesce(cuota.monto_cubierto, 0);

      if v_restante >= v_falta_cuota then
        update cuotas
        set estado = 'Pagado', monto_cubierto = cuota.importe
        where id_pedido = v_id_pedido and numero = cuota.numero;

        v_restante := v_restante - v_falta_cuota;
      else
        update cuotas
        set estado = 'Parcial', monto_cubierto = coalesce(cuota.monto_cubierto, 0) + v_restante
        where id_pedido = v_id_pedido and numero = cuota.numero;

        v_restante := 0;
      end if;
    end loop;
  end if;

  return v_id_pago;
end;
$$;
