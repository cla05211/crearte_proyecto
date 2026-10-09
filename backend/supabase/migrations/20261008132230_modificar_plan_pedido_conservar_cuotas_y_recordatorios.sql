-- modificar_plan_pedido: las cuotas ya no se borran y recrean, se actualizan por número.
--
-- Antes: delete de todas las cuotas + insert de cero. Como notificaciones_whatsapp.id_cuota
-- tiene on delete cascade, eso borraba los recordatorio_pago (incluso los ya enviados),
-- y las cuotas nuevas quedaban sin recordatorio.
--
-- Ahora (el cálculo de importes/estados/fechas es el mismo, salvo el fix de la cuota Parcial):
--   * cuota con ese número ya existe  -> update (conserva su id y sus recordatorios)
--   * no existe (el plan creció)       -> insert
--   * sobra (el plan se achicó)        -> delete (el cascade borra su recordatorio)
-- Y al final se ajustan los recordatorio_pago del pedido:
--   1. la última cuota no lleva recordatorio -> si tiene uno pendiente, se cancela
--   2. cuotas no pagadas (menos la última) con recordatorio pendiente o cancelado
--      -> vuelve a 'pendiente' y se resincroniza la fecha (vencimiento - 7).
--      Cubre: la cuota volvió a tener deuda, o dejó de ser la última.
--      Los 'enviado' y 'error' no se tocan.
--   3. cuotas no pagadas (menos la última) sin recordatorio -> se crea.

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
  v_monto_cubierto      double precision;
  v_resto_cubierto      double precision;
  v_estado_cuota        text;

  i                      int;
  v_numero               int;
  v_id_cuota             bigint;
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

  -- ---- Cuotas: se actualizan por número (ya no se borran, ver encabezado) ----

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

  -- Lo que sobra después de cubrir esas v_cuotas_pagadas cuotas enteras no
  -- alcanza para una más, pero tampoco se pierde: queda acreditado como
  -- monto_cubierto en la próxima cuota, que pasa a estado 'Parcial'.
  v_resto_cubierto := greatest(v_total_pagado - v_valor_senia_nuevo, 0)
    - (v_cuotas_pagadas * v_valor_cuota_nuevo);

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
      v_estado_cuota   := 'Pagada';
      v_importe_cuota  := v_valor_cuota_nuevo;
      v_monto_cubierto := v_valor_cuota_nuevo;
    elsif v_numero = v_cuotas_pagadas + 1 and v_resto_cubierto > 0 then
      v_estado_cuota   := 'Parcial';
      -- El importe de la parcial incluye lo ya cubierto: antes era solo
      -- v_importe_pendiente y el saldo adeudado quedaba corto en v_resto_cubierto.
      v_importe_cuota  := v_importe_pendiente + v_resto_cubierto;
      v_monto_cubierto := v_resto_cubierto;
    else
      v_estado_cuota   := 'Pendiente';
      v_importe_cuota  := v_importe_pendiente;
      v_monto_cubierto := 0;
    end if;

    update cuotas
    set fecha_vencimiento = v_fecha_calculada,
        importe           = v_importe_cuota,
        estado            = v_estado_cuota,
        monto_cubierto    = v_monto_cubierto
    where id_pedido = v_id_pedido and numero = v_numero
    returning id into v_id_cuota;

    if not found then
      insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado, monto_cubierto)
      values (v_id_pedido, v_numero, v_fecha_calculada, v_importe_cuota, v_estado_cuota, v_monto_cubierto);
    end if;
  end loop;

  -- Si el plan se achicó, las cuotas que sobran se borran
  -- (on delete cascade se lleva sus recordatorios).
  delete from cuotas
  where id_pedido = v_id_pedido and numero > v_nueva_cant_cuotas;

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
    'cuotas_pagadas', v_cuotas_pagadas,
    'cuotas_pendientes', v_nueva_cant_cuotas - v_cuotas_pagadas,
    'total_pagado', v_total_pagado
  );
end;
$$;
