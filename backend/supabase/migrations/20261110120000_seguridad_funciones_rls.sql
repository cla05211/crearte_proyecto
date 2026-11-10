-- Seguridad: nada de la base tiene que ser accesible con la anon key.
-- El backend usa la service_role (que saltea RLS y conserva sus permisos), así que esto no lo afecta.

-- 1) Funciones: por defecto Postgres da EXECUTE a PUBLIC, y algunas además tenían "grant ... to anon".
--    Las SECURITY DEFINER (crear_pedido_completo, modificar_plan_pedido, modificar_beneficios_pedido, ...)
--    se podían llamar por /rest/v1/rpc salteando el backend.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- Y lo mismo para las funciones que se creen de acá en adelante
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public grant execute on functions to service_role;

-- 2) RLS activado en todas las tablas de public (sesiones_clientes, muestras_fisicas y producto_componentes no lo tenían).
--    Sin políticas, anon y authenticated no pueden leer ni escribir nada; service_role no se ve afectado.
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- 3) Las vistas corren con los permisos de su dueño (postgres) y saltean RLS salvo que tengan security_invoker.
--    vista_caja exponía todos los pagos y movimientos.
do $$
declare
  v record;
begin
  for v in select viewname from pg_views where schemaname = 'public' loop
    execute format('alter view public.%I set (security_invoker = true)', v.viewname);
  end loop;
end $$;
