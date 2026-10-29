-- Modificar el plan de un pedido (talles, Ventas, Presupuesto) ya no regenera todo desde cero:
--   * La seña queda fija en lo que ya era (siempre tiene algún pago). Se guarda en pedidos.senia_total;
--     mientras sea null (pedido nunca modificado) vale la suma de valor_senia * cantidad de los productos.
--   * Las cuotas 'Pagada' no se tocan (importe, fecha, estado).
--   * Lo que falta (total del plan nuevo - seña - cuotas pagadas) se reparte en partes iguales entre las
--     cuotas que quedan. Lo cubierto se recalcula con los pagos que no son de seña, aplicados en orden.
--   * Fechas: si no cambia la cantidad de cuotas se conservan; si cambia, las no pagadas se recalculan mes a
--     mes desde la cuota 1. Con fecha de entrega (pedido en fábrica), la última cuota vence en la entrega.

ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS senia_total double precision;

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
  select coalesce(sum(monto), 0) into v_disponible
  from pagos
  where id_pedido = v_id_pedido and motivo is distinct from 'Seña';

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
