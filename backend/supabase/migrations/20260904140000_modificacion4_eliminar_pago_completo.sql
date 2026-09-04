create or replace function eliminar_pago_completo(
  p_id_pago integer
)
returns integer
language plpgsql
as $$
declare
  v_id_pedido integer;
  v_restante numeric;
  v_falta_cuota numeric;
  cuota record;
begin
  delete from pagos
  where id = p_id_pago
  returning id_pedido into v_id_pedido;

  if v_id_pedido is null then
    raise exception 'No existe el pago con id %', p_id_pago;
  end if;

  update cuotas
  set estado = 'Pendiente', monto_cubierto = 0
  where id_pedido = v_id_pedido;

  select coalesce(sum(monto), 0) into v_restante
  from pagos
  where id_pedido = v_id_pedido
    and motivo != 'Seña';

  for cuota in
    select * from cuotas
    where id_pedido = v_id_pedido
    order by numero asc
  loop
    exit when v_restante <= 0;

    v_falta_cuota := cuota.importe - coalesce(cuota.monto_cubierto, 0);

    if v_restante >= v_falta_cuota then
      update cuotas
      set estado = 'Pagada', monto_cubierto = cuota.importe
      where id_pedido = v_id_pedido and numero = cuota.numero;

      v_restante := v_restante - v_falta_cuota;
    else
      update cuotas
      set estado = 'Parcial', monto_cubierto = coalesce(cuota.monto_cubierto, 0) + v_restante
      where id_pedido = v_id_pedido and numero = cuota.numero;

      v_restante := 0;
    end if;
  end loop;

  return v_id_pedido;
end;
$$;
