-- Tipo de plan guardado en el pedido: pedidos.con_senia
--   true  = "N cuotas + Seña" (la seña es un pago aparte, distinto de la cuota)
--   false = "N+1 cuotas iguales" (la seña es la cuota 1)
-- Antes se deducía de varias formas (comparando seña y cuota de los productos, del catálogo por cantidad
-- de cuotas, o de los totales), y fallaba con agregados, bandera o cambios en la lista de precios.
-- La etiqueta se arma con con_senia + cantidad de cuotas.

alter table public.pedidos add column if not exists con_senia boolean;

-- Backfill: catálogo según la cantidad de cuotas del pedido; si ese plan ya no está, se compara el primer producto.
update public.pedidos p
set con_senia = coalesce(
  (
    select bool_or(pp.valor_senia <> pp.valor_cuota)
    from public.precios_productos pp
    where pp.cuotas = (select count(*) from public.cuotas c where c.id_pedido = p.id)
  ),
  (
    select pr.valor_senia <> pr.valor_cuota
    from public.productos_pedidos pr
    where pr.id_pedido = p.id
    order by pr.id
    limit 1
  ),
  true
)
where p.con_senia is null;

alter table public.pedidos alter column con_senia set not null;

-- crear_pedido_completo: guarda con_senia (pedidoDTO.con_senia, obligatorio).
-- El resto queda igual que en 20261019150000_crear_pedido_completo_alumno_principal.sql.
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
  importe_cuota   double precision;
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
    estado_boceto, estado_talles, id_disenadora, con_senia
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
    (payload->'pedidoDTO'->>'con_senia')::boolean
  )
  returning id into id_pedido;

  -- Productos del pedido
  for producto in select * from jsonb_array_elements(payload->'productosPedidoDTO')
  loop
    insert into productos_pedidos (
      id_pedido, id_producto_original, cantidad, descripcion, valor_senia, valor_cuota
    )
    values (
      id_pedido,
      (producto->>'id_producto_original')::bigint,
      (producto->>'cantidad')::int,
      producto->>'descripcion',
      (producto->>'valor_senia')::real,
      (producto->>'valor_cuota')::real
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
    insert into agregados_globales_pedido (id_pedido, id_agregado)
    values (id_pedido, (agregado_global->>'id_agregado')::bigint);
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
  -- replicando CuotasService.acomodarFecha().
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

    -- Muestras físicas (solo si el pedido no es de talles digitales)
  if (payload->'pedidoDTO'->>'talles') is distinct from 'Digital' then
    insert into muestras_fisicas (id_pedido, estado)
    values (id_pedido, 'Pendiente');
  end if;

  return jsonb_build_object('id_pedido', id_pedido, 'usuario', usuario_final);
end;
$$;

-- modificar_plan_pedido: si el payload trae con_senia, actualiza el tipo de plan.
-- El resto queda igual que en 20261103120000_modificar_plan_excedente_senia.sql.
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

  v_senia_actual        double precision;
  v_senia_pagada        double precision;
  v_senia_final         double precision;
  v_total_pagado        double precision;
  v_total_plan_nuevo    double precision;

  v_cant_actual         int;
  v_max_pagada          int;
  v_suma_pagadas        double precision;
  v_restante            double precision;
  v_libres              int;
  v_parte               double precision;
  v_asignado            double precision;
  v_libres_restantes    int;
  v_disponible          double precision;

  v_fecha_primera       date;
  v_fecha_entrega       date;
  v_dia_original        int;
  v_fecha_mes_base      date;
  v_ultimo_dia_mes      int;
  v_fecha_calculada     date;
  v_fecha_anterior      date;

  r                     record;
  i                     int;
  v_importe             double precision;
  v_cubierto            double precision;
  v_estado              text;
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
  v_senia_final := case when v_senia_pagada > 0 then v_senia_actual else v_valor_senia_nuevo end;

  -- ---- Productos: se borran todos y se insertan de cero ----
  delete from productos_pedidos where id_pedido = v_id_pedido;

  for producto in select * from jsonb_array_elements(payload->'productos')
  loop
    insert into productos_pedidos (
      id_pedido, id_producto_original, cantidad, descripcion, valor_senia, valor_cuota
    )
    values (
      v_id_pedido,
      (producto->>'id_producto_original')::bigint,
      (producto->>'cantidad')::int,
      producto->>'descripcion',
      (producto->>'valor_senia')::real,
      (producto->>'valor_cuota')::real
    );
  end loop;

  -- ---- Agregados globales del pedido: se borran todos y se insertan de cero ----
  delete from agregados_globales_pedido where id_pedido = v_id_pedido;

  for agregado_global in select * from jsonb_array_elements(coalesce(payload->'agregadosGlobales', '[]'::jsonb))
  loop
    insert into agregados_globales_pedido (id_pedido, id_agregado)
    values (v_id_pedido, (agregado_global->>'id_agregado')::bigint);
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
  v_restante := v_total_plan_nuevo - v_senia_final - v_suma_pagadas;

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
    v_parte := round((v_restante / v_libres)::numeric, 2);
    v_asignado := 0;
    v_libres_restantes := v_libres;

    for r in
      select id from cuotas
      where id_pedido = v_id_pedido and estado <> 'Pagada'
      order by numero
    loop
      v_libres_restantes := v_libres_restantes - 1;
      v_importe := case when v_libres_restantes = 0 then round((v_restante - v_asignado)::numeric, 2) else v_parte end;
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
$$;
