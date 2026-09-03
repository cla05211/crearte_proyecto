-- Agrega detalle_cuotas a pagos: un snapshot congelado, tomado en el momento
-- en que se registra el pago, de a qué cuota(s) correspondió (según el plan
-- de cuotas vigente en ESE momento). No se actualiza si el pedido se
-- modifica después (modificar_plan_pedido puede renumerar/redefinir las
-- cuotas) -- un recibo es un comprobante histórico, no debe cambiar
-- retroactivamente porque el plan se renegoció más adelante.
--
-- Formato de detalle_cuotas (jsonb array):
--   [{ "tipo": "senia" }]
--   [{ "tipo": "completa", "numero": 2 }]
--   [{ "tipo": "parcial", "numero": 3, "monto": 1500 }]
--   [{ "tipo": "completa", "numero": 2 }, { "tipo": "parcial", "numero": 3, "monto": 800 }]
--   [{ "tipo": "excedente", "monto": 500 }]  -- sobró plata sin cuotas pendientes para cubrir

alter table public.pagos add column if not exists detalle_cuotas jsonb;

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

        v_detalle := v_detalle || jsonb_build_array(jsonb_build_object('tipo', 'completa', 'numero', cuota.numero));
        v_restante := v_restante - v_falta_cuota;
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
