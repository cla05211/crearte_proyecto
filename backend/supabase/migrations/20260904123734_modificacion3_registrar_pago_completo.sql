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
  cuota record;
begin
  v_id_pedido := (p_pago->>'id_pedido')::integer;
  v_monto := (p_pago->>'monto')::numeric;
  v_motivo := p_pago->>'motivo';

insert into pagos (
    id_pedido, nro_transferencia, monto, motivo, fecha, aprobado, banco, enviado_banco, entidad_pago, id_documento
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
    (p_pago->>'id_documento')::bigint
  )
  returning id into v_id_pago;

  if v_motivo = 'Seña' then
    v_detalle := jsonb_build_array(jsonb_build_object('tipo', 'senia'));
  else
    v_restante := round(v_monto, 2);

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
  end if;

  update pagos set detalle_cuotas = v_detalle where id = v_id_pago;

  return v_id_pago;
end;
$$;