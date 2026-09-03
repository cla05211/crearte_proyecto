-- Backfill de detalle_cuotas para pagos registrados ANTES de la migración
-- 20260903090000 (por lo tanto con detalle_cuotas = null).
--
-- Por cada pedido, recorre TODOS sus pagos que no son 'Seña' en orden
-- cronológico (fecha, id) y reproduce el mismo algoritmo waterfall que usa
-- registrar_pago_completo, pero contra un mapa LOCAL simulado de cobertura
-- por cuota (arranca en 0 para todas) -- no se toca la tabla `cuotas` en
-- ningún momento, esa ya tiene el estado final correcto de cuando cada pago
-- se aplicó de verdad. Solo se persiste el resultado en los pagos que
-- todavía tienen detalle_cuotas nulo; los que ya lo tienen (posteriores a
-- la migración anterior) se recorren igual para consumir su parte de la
-- simulación, pero no se pisan.
--
-- Limitación conocida: si a un pedido se le corrió modificar_plan_pedido
-- después de algunos pagos, las cuotas originales contra las que se
-- aplicaron esos pagos ya no existen (se borran y reinsertan con otro
-- número/importe). Para esos casos este backfill hace lo mejor posible
-- replayando contra el plan de cuotas ACTUAL, que puede no coincidir
-- exactamente con el que estaba vigente en el momento del pago.

do $$
declare
  r_pedido record;
  r_pago record;
  r_cuota record;
  v_restante numeric;
  v_falta_cuota numeric;
  v_cubierto numeric;
  v_detalle jsonb;
  cuotas_local jsonb;
begin
  for r_pedido in select distinct id_pedido from pagos where id_pedido is not null loop

    cuotas_local := '{}'::jsonb;
    for r_cuota in
      select numero from cuotas
      where id_pedido = r_pedido.id_pedido and numero is not null
    loop
      cuotas_local := cuotas_local || jsonb_build_object(r_cuota.numero::text, 0);
    end loop;

    for r_pago in
      select id, motivo, monto, detalle_cuotas
      from pagos
      where id_pedido = r_pedido.id_pedido
      order by fecha asc, id asc
    loop
      if r_pago.motivo = 'Seña' then
        if r_pago.detalle_cuotas is null then
          update pagos
          set detalle_cuotas = jsonb_build_array(jsonb_build_object('tipo', 'senia'))
          where id = r_pago.id;
        end if;
        continue;
      end if;

      v_restante := coalesce(r_pago.monto, 0);
      v_detalle := '[]'::jsonb;

      for r_cuota in
        select numero, coalesce(importe, 0) as importe from cuotas
        where id_pedido = r_pedido.id_pedido and numero is not null
        order by numero asc
      loop
        exit when v_restante <= 0;

        v_cubierto := coalesce((cuotas_local ->> r_cuota.numero::text)::numeric, 0);
        v_falta_cuota := r_cuota.importe - v_cubierto;

        if v_falta_cuota <= 0 then
          continue;
        end if;

        if v_restante >= v_falta_cuota then
          cuotas_local := jsonb_set(cuotas_local, array[r_cuota.numero::text], to_jsonb(r_cuota.importe));
          v_detalle := v_detalle || jsonb_build_array(jsonb_build_object('tipo', 'completa', 'numero', r_cuota.numero));
          v_restante := v_restante - v_falta_cuota;
        else
          cuotas_local := jsonb_set(cuotas_local, array[r_cuota.numero::text], to_jsonb(v_cubierto + v_restante));
          v_detalle := v_detalle || jsonb_build_array(jsonb_build_object('tipo', 'parcial', 'numero', r_cuota.numero, 'monto', v_restante));
          v_restante := 0;
        end if;
      end loop;

      if v_restante > 0 then
        v_detalle := v_detalle || jsonb_build_array(jsonb_build_object('tipo', 'excedente', 'monto', v_restante));
      end if;

      if r_pago.detalle_cuotas is null then
        update pagos set detalle_cuotas = v_detalle where id = r_pago.id;
      end if;
    end loop;

  end loop;
end;
$$;
