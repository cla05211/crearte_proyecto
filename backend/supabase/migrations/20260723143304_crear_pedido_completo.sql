-- Función atómica para crear un pedido completo (colegio, grupo, pedido,
-- productos, padres, alumnos, pago, documentos, movimiento y cuotas).
-- Si algo falla en el medio, Postgres hace rollback de todo automáticamente.
 
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
    estado_boceto, estado_talles, id_diseñadora
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
    (payload->'pedidoDTO'->>'id_diseñadora')::bigint
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
 
  -- Pago
  -- NOTA: PagoDTO no incluye 'fecha' actualmente; si no se manda, queda null.
  insert into pagos (id_pedido, nro_transferencia, tipo_pago, monto, motivo, fecha, aprobado, banco)
  values (
    id_pedido,
    payload->'pagoDTO'->>'nro_transferencia',
    payload->'pagoDTO'->>'tipo_pago',
    (payload->'pagoDTO'->>'monto')::double precision,
    payload->'pagoDTO'->>'motivo',
    (payload->'pagoDTO'->>'fecha')::date,
    payload->'pagoDTO'->>'aprobado',
    payload->'pagoDTO'->>'banco',
  )
  returning id into id_pago;
 
  -- Documentos (uno o varios) + vínculo con el pago
  if jsonb_typeof(payload->'documentoDTO') = 'array' then
    for documento in select * from jsonb_array_elements(payload->'documentoDTO')
    loop
      insert into documentos (id_grupo, tipo, archivo_url)
      values (id_grupo, documento->>'tipo', documento->>'archivo_url')
      returning id into id_documento;
 
      insert into pagos_documentos (id_pago, id_documento)
      values (id_pago, id_documento);
    end loop;
  else
    insert into documentos (id_grupo, tipo, archivo_url)
    values (
      id_grupo,
      payload->'documentoDTO'->>'tipo',
      payload->'documentoDTO'->>'archivo_url'
    )
    returning id into id_documento;
 
    insert into pagos_documentos (id_pago, id_documento)
    values (id_pago, id_documento);
  end if;
 
  -- Movimiento en cuenta corriente
  insert into movimientos (id_grupo, importe, fecha)
  values (
    id_grupo,
    (payload->'movimientoDTO'->>'importe')::double precision,
    (payload->'movimientoDTO'->>'fecha')::timestamp
  );
 
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