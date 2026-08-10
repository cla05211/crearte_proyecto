-- VESION 2: Función atómica para modificar los productos y/o el plan de cuotas de un
-- pedido ya creado. Borra productos_pedidos y cuotas existentes, e inserta
-- todo de cero (misma filosofía en toda la operación, sin parchear valores
-- sueltos). Si algo falla en el medio (ej: sobrepago), Postgres hace
-- rollback de todo automáticamente.
--
-- Payload esperado:
-- {
--   "id_pedido": 123,
--   "productos": [
--     { "id_producto_original": 5, "cantidad": 30, "descripcion": "...",
--       "valor_senia": 10000, "valor_cuota": 4500, "beneficio": "..." },
--     ...
--   ],
--   "nueva_cantidad_cuotas": 4,
--   "valor_cuota_nuevo": 18500,   -- total del pedido por cuota, bajo el plan nuevo
--   "valor_senia_nuevo": 10000    -- total de seña del pedido, bajo el plan nuevo (0 si el plan no tiene seña, ej. 3 cuotas)
-- }
--
-- Devuelve un jsonb con un resumen de lo aplicado (útil para mostrarle
-- al vendedor qué quedó pagado/pendiente sin tener que volver a consultar).
 
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
   -- Version 2
end;
$$;
 