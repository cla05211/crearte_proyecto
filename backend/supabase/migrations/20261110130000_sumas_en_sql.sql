-- Totales calculados en la base en vez de traer todas las filas al backend y sumarlas en TypeScript.
-- Supabase corta las consultas en 1000 filas sin avisar: con más pagos o movimientos, los totales quedaban mal.

create or replace function public.sumar_pagos(
  p_bancos              text[]  default null,  -- solo estos bancos (null = todos)
  p_excluir_bancos      text[]  default null,  -- menos estos bancos
  p_desde               date    default null,  -- fecha >= p_desde
  p_hasta               date    default null,  -- fecha <  p_hasta
  p_excluir_devolucion  boolean default true   -- la devolución por baja (pago negativo) no es plata que entró
)
returns numeric
language sql
stable
as $$
  select coalesce(sum(monto), 0)
  from public.pagos
  where (p_bancos is null or banco = any(p_bancos))
    and (p_excluir_bancos is null or banco <> all(p_excluir_bancos))
    and (p_desde is null or fecha >= p_desde)
    and (p_hasta is null or fecha < p_hasta)
    and (not p_excluir_devolucion or motivo is distinct from 'Devolución');
$$;

create or replace function public.sumar_movimientos_caja(p_tipo text)
returns numeric
language sql
stable
as $$
  select coalesce(sum(monto), 0)
  from public.movimientos_caja
  where tipo = p_tipo;
$$;

revoke execute on function public.sumar_pagos(text[], text[], date, date, boolean) from public, anon, authenticated;
revoke execute on function public.sumar_movimientos_caja(text) from public, anon, authenticated;
grant execute on function public.sumar_pagos(text[], text[], date, date, boolean) to service_role;
grant execute on function public.sumar_movimientos_caja(text) to service_role;
