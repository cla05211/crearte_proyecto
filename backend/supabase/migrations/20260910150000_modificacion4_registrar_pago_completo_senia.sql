-- Los pagos con motivo 'Seña' siguen totalmente aislados de las cuotas (igual
-- que antes: no entran al loop de derrame ni afectan cuotas.monto_cubierto).
-- Lo nuevo es que un pago genérico (ej: 'Cuota', cargado desde el botón
-- "Agregar" de cuenta corriente) ahora primero cubre el faltante de seña
-- (valor_senia*cantidad de productos_pedidos, menos lo ya pagado con motivo
-- 'Seña') antes de derramar en las cuotas. Si el monto alcanza para ambas
-- cosas, se generan dos filas en "pagos" (una 'Seña' y una con el motivo
-- original) en vez de una sola, para que cuenta corriente pueda seguir
-- calculando lo cubierto de la seña filtrando por motivo = 'Seña'.
create or replace function registrar_pago_completo(
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

  select coalesce(sum(valor_senia * cantidad), 0) into v_senia_total
  from productos_pedidos
  where id_pedido = v_id_pedido;

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

      v_falta_cuota := round(cuota.importe - coalesce(cuota.monto_cubierto, 0), 2);

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
