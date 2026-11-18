-- ============================================================================
-- Datos de prueba para Control de Producción → Envíos / Pedidos entregados
-- Crea 8 colegios "PRUEBA ENVIOS - ..." con su grupo, pedido, contrato y fila en pedidos_envio:
--   * 3 en "Envío por correo"   (no zona sur, estado_general = 'Listo para entregar')
--   * 2 en "Retiro por oficina" (zona sur,    estado_general = 'Listo para entregar')
--   * 3 en "Pedidos entregados" (estado_general = 'Entregado'), 2 este mes y 1 el mes pasado
-- Los nro_fabrica de prueba van del 90001 al 90008. Para borrarlos, ver el script al final.
-- ============================================================================

do $$
declare
  r          record;
  v_colegio  bigint;
  v_grupo    bigint;
  v_pedido   bigint;
begin
  for r in
    select * from (values
      -- nombre,                       localidad,          zona_sur, nro,   envio_gratis, firmado, estado_pedido,          estado_envio,          pago,       bultos,    empresa,            datos, calendario,  forma,            entregado, fecha_entrega
      ('PRUEBA ENVIOS - Correo 1'::text, 'Rosario'::text,   false,    90001, true,         true,    'Listo para entregar'::text, 'Pendiente de hablar'::text, 'No'::text, null::int, null::text,         false, 'Pendiente'::text, 'Envio'::text,    false, (date_trunc('month', current_date) + interval '1 month')::date),
      ('PRUEBA ENVIOS - Correo 2',       'Córdoba',         false,    90002, false,        false,   'Listo para entregar',       'Hable',                     'Sí',       3,         'Via cargo',        true,  'Pendiente',       'Envio',          false, (date_trunc('month', current_date) + interval '1 month')::date),
      ('PRUEBA ENVIOS - Correo 3',       'Mar del Plata',   false,    90003, true,         true,    'Listo para entregar',       'Paga interés',              'Sí',       2,         'Andreani',         false, 'Pendiente',       'Envio',          false, (date_trunc('month', current_date) + interval '1 month')::date),
      ('PRUEBA ENVIOS - Retiro 1',       'Quilmes',         true,     90004, false,        true,    'Listo para entregar',       'Pendiente de hablar',       'No',       null,      null,               false, 'Pendiente',       'Retiro oficina', false, (current_date + 10)),
      ('PRUEBA ENVIOS - Retiro 2',       'Lomas de Zamora', true,     90005, false,        false,   'Listo para entregar',       'Cliente demorado',          'Efectivo', null,      null,               false, 'Comisionista',    'Retiro oficina', false, (current_date + 20)),
      ('PRUEBA ENVIOS - Entregado 1',    'La Plata',        true,     90006, false,        true,    'Entregado',                 'Hable',                     'Efectivo', null,      null,               false, 'Agendado',        'Retiro oficina', true,  date_trunc('month', current_date)::date),
      ('PRUEBA ENVIOS - Entregado 2',    'Mendoza',         false,    90007, true,         true,    'Entregado',                 'Hable',                     'Sí',       4,         'Andreani',         true,  'Pendiente',       'Envio',          true,  (date_trunc('month', current_date) + interval '1 day')::date),
      ('PRUEBA ENVIOS - Entregado 3',    'Adrogué',         true,     90008, false,        true,    'Entregado',                 'Hable',                     'Sí',       null,      null,               false, 'Comisionista',    'Comisionista',   true,  (date_trunc('month', current_date) - interval '1 month' + interval '14 days')::date)
    ) as t(nombre, localidad, zona_sur, nro, envio_gratis, firmado, estado_pedido, estado_envio, pago, bultos,
           empresa, datos, calendario, forma, entregado, fecha_entrega)
  loop
    insert into colegios (nombre, localidad, provincia, zona_sur)
    values (r.nombre, r.localidad, 'Buenos Aires', r.zona_sur)
    returning id into v_colegio;

    insert into grupos (id_colegio, promo, turno, nivel)
    values (v_colegio, extract(year from current_date)::int, 'Mañana', 'Secundario')
    returning id into v_grupo;

    insert into pedidos (id_grupo, estado_general, nro_fabrica, envio_gratis, fecha_entrega_aproximada, con_senia)
    values (v_grupo, r.estado_pedido, r.nro, r.envio_gratis, (date_trunc('month', r.fecha_entrega))::date, true)
    returning id into v_pedido;

    if r.firmado then
      insert into contratos (grupo, firmado, fecha_firma) values (v_grupo, true, current_date - 30);
    end if;

    insert into pedidos_envio (id_pedido, estado, pago_realizado, cant_bultos, empresa_envio, datos_envio,
                               calendario, forma_entrega, entregado, fecha_entrega)
    values (v_pedido, r.estado_envio, r.pago, r.bultos, r.empresa, r.datos,
            r.calendario, r.forma, r.entregado, r.fecha_entrega);
  end loop;
end $$;


-- ============================================================================
-- PARA BORRAR LOS DATOS DE PRUEBA (descomentar y correr):
-- Borra también los egresos de caja y comprobantes que hayas cargado probando.
-- ============================================================================
-- delete from movimientos_caja where id in (
--   select pe.id_movimiento_caja from pedidos_envio pe
--   join pedidos p on p.id = pe.id_pedido
--   join grupos g on g.id = p.id_grupo
--   join colegios c on c.id = g.id_colegio
--   where c.nombre like 'PRUEBA ENVIOS - %' and pe.id_movimiento_caja is not null);
--
-- delete from pedidos  where id_grupo in (select g.id from grupos g join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA ENVIOS - %');
-- delete from contratos  where grupo    in (select g.id from grupos g join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA ENVIOS - %');
-- delete from documentos where id_grupo in (select g.id from grupos g join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA ENVIOS - %');
-- delete from grupos where id_colegio in (select id from colegios where nombre like 'PRUEBA ENVIOS - %');
-- delete from colegios where nombre like 'PRUEBA ENVIOS - %';
