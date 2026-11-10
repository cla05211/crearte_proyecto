-- Montos de plata: real / double precision -> numeric.
-- real (float4) guarda ~7 dígitos: montos de millones perdían centavos, y los double dejaban restos
-- tipo 0,0000001 que hacían que una cuota quedara "Parcial". numeric guarda el valor exacto.
-- Los real se redondean a 2 decimales al convertir (pasando por float8: float4 -> numeric directo
-- redondea a 6 dígitos significativos y 123456.78 quedaría 123457).

-- Las vistas dependen de pagos.monto: se borran y se recrean al final
drop view if exists public.pagos_banco;
drop view if exists public.vista_caja;

alter table public.pagos              alter column monto       type numeric using monto::numeric;
alter table public.cuotas             alter column importe     type numeric using importe::numeric;
alter table public.pedidos            alter column senia_total type numeric using senia_total::numeric;
alter table public.agregados          alter column precio      type numeric using round(precio::float8::numeric, 2);
alter table public.precios_productos  alter column valor_senia type numeric using round(valor_senia::float8::numeric, 2);
alter table public.precios_productos  alter column valor_cuota type numeric using round(valor_cuota::float8::numeric, 2);
alter table public.productos_pedidos  alter column valor_senia type numeric using round(valor_senia::float8::numeric, 2);
alter table public.productos_pedidos  alter column valor_cuota type numeric using round(valor_cuota::float8::numeric, 2);

-- Mismas vistas que 20261106120000_excluir_devolucion_caja_bancos.sql
CREATE VIEW public.pagos_banco
WITH (security_invoker = true) AS
SELECT
  min(p.id)                                         AS id,
  array_agg(p.id ORDER BY p.id)                     AS ids_pagos,
  p.id_documento,
  p.id_pedido,
  p.banco,
  min(p.fecha)                                      AS fecha,
  min(p.created_at)                                 AS created_at,
  max(p.nro_transferencia)                          AS nro_transferencia,
  max(p.entidad_pago)                               AS entidad_pago,
  sum(p.monto)                                      AS monto,
  string_agg(DISTINCT p.motivo, ' + ')              AS motivo,
  bool_and(coalesce(p.aprobado, false))             AS aprobado,
  bool_and(coalesce(p.enviado_banco, false))        AS enviado_banco,
  ped.estado_general,
  g.id                                              AS id_grupo,
  g.turno,
  g.orientacion,
  g.nivel,
  c.nombre                                          AS nombre_colegio,
  c.localidad
FROM pagos p
JOIN pedidos ped ON ped.id = p.id_pedido
JOIN grupos g ON g.id = ped.id_grupo
JOIN colegios c ON c.id = g.id_colegio
-- La devolución por baja no es plata que entró: no se lista ni se cuenta
WHERE p.motivo IS DISTINCT FROM 'Devolución'
GROUP BY
  coalesce(p.id_documento::text, 'pago-' || p.id::text),
  p.id_documento, p.id_pedido, p.banco,
  ped.estado_general, g.id, g.turno, g.orientacion, g.nivel, c.nombre, c.localidad;

create view public.vista_caja
with (security_invoker = true) as
select
  ('pagos-' || p.id)::text as id,
  p.fecha,
  'ingreso'::text as tipo,
  'Pago cliente'::text as categoria,
  coalesce(p.motivo, 'Pago pedido #' || p.id_pedido)::text as descripcion,
  p.monto::numeric as monto,
  null::bigint as usuario,
  p.id_pedido as id_pedido,
  'pagos'::text as origen,
  p.id as orden
from pagos p
where p.banco ilike 'Efectivo'
  -- La devolución en efectivo la cargan a mano como egreso en movimientos_caja
  and p.motivo is distinct from 'Devolución'

union all

select
  ('caja-' || mc.id)::text as id,
  mc.fecha,
  mc.tipo,
  mc.categoria,
  mc.descripcion,
  mc.monto,
  mc.usuario,
  null::bigint as id_pedido,
  'movimientos_caja'::text as origen,
  mc.id as orden
from movimientos_caja mc;


-- crear_pedido_completo y modificar_plan_pedido: iguales a 20261103130000_pedidos_con_senia.sql,
-- pero con numeric en vez de real / double precision en casts y variables.
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
      (producto->>'valor_senia')::numeric,
      (producto->>'valor_cuota')::numeric
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
  importe_cuota  := (payload->'primerCuota'->>'importe')::numeric;
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
      (producto->>'valor_senia')::numeric,
      (producto->>'valor_cuota')::numeric
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
