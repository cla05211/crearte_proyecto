-- Envíos gratis pagados por transferencia: se registran en movimientos_caja como egreso con categoría
-- 'Envíos Transferencia' para que se vean en caja (vista_caja ya muestra todos los movimientos),
-- pero no salen del efectivo, así que no se cuentan en la suma de egresos.
-- Mismo que 20261110130000_sumas_en_sql.sql, con la exclusión.
create or replace function public.sumar_movimientos_caja(p_tipo text)
returns numeric
language sql
stable
as $$
  select coalesce(sum(monto), 0)
  from public.movimientos_caja
  where tipo = p_tipo
    and categoria is distinct from 'Envíos Transferencia';
$$;

revoke execute on function public.sumar_movimientos_caja(text) from public, anon, authenticated;
grant execute on function public.sumar_movimientos_caja(text) to service_role;
