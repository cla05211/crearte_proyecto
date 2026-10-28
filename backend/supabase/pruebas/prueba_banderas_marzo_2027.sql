-- DATOS DE PRUEBA para ver la planilla de banderas (fecha de entrega marzo 2027).
-- Correrlo en el SQL Editor de Supabase DESPUÉS de aplicar 20261027160000_tabla_banderas_pedido.sql.
-- Todos los colegios empiezan con "PRUEBA Banderas" para poder borrarlos con el script de abajo.
-- NO es una migración: no ponerlo en supabase/migrations.

do $$
declare
  v_disenadora1 bigint;
  v_disenadora2 bigint;
  v_colegio bigint;
  v_grupo bigint;
  v_pedido bigint;
begin
  -- Dos diseñadoras cualquiera (rol 4); si no hay, quedan sin asignar
  select id into v_disenadora1 from usuarios where rol = 4 order by id limit 1;
  select id into v_disenadora2 from usuarios where rol = 4 order by id offset 1 limit 1;
  v_disenadora2 := coalesce(v_disenadora2, v_disenadora1);

  -- 1) Una sola bandera por beneficio, pendiente de hablar
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Banderas - San Martín', 'Quilmes', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Secundaria', 2027, 'Mañana', 'Naturales') returning id into v_grupo;
  insert into alumnos_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Lucía', 'Gómez', '1155550001', true);
  insert into pedidos (id_grupo, estado_general, fecha_entrega_aproximada) values (v_grupo, 'En producción', '2027-03-05') returning id into v_pedido;
  insert into banderas_pedido (id_pedido, origen, estado_boceto) values (v_pedido, 'Beneficio', 'Pendiente de hablar');

  -- 2) Tres banderas: 2 por beneficio + 1 comprada, distintos estados y diseñadoras
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Banderas - Normal 3', 'Lomas de Zamora', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Secundaria', 2027, 'Tarde', 'Sociales') returning id into v_grupo;
  insert into alumnos_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Tomás', 'Pérez', '1155550002', true);
  insert into pedidos (id_grupo, estado_general, fecha_entrega_aproximada) values (v_grupo, 'En producción', '2027-03-10') returning id into v_pedido;
  insert into banderas_pedido (id_pedido, origen, estado_boceto, id_disenadora) values
    (v_pedido, 'Beneficio', 'Confirmada', v_disenadora1),
    (v_pedido, 'Beneficio', 'Diseñada',   v_disenadora2),
    (v_pedido, 'Comprada',  'Sin respuesta', null);

  -- 3) Dos banderas: una perdió el beneficio (va a la 2da tabla) y otra sigue normal
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Banderas - Instituto Belgrano', 'Banfield', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Primaria', 2027, 'Mañana', null) returning id into v_grupo;
  insert into padres_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Mariana', 'López', '1155550003', true);
  insert into pedidos (id_grupo, estado_general, fecha_entrega_aproximada) values (v_grupo, 'En producción', '2027-03-15') returning id into v_pedido;
  insert into banderas_pedido (id_pedido, origen, estado_boceto, id_disenadora, motivo_perdida_beneficio) values
    (v_pedido, 'Beneficio', 'Diseñada', v_disenadora1, null),
    (v_pedido, 'Beneficio', 'Pendiente de hablar', null, 'No llegaron a la cantidad mínima de buzos');

  -- 4) Ya listo para entregar, una comprada confirmada
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Banderas - Colegio del Sur', 'Adrogué', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Secundaria', 2027, 'Mañana', 'Economía') returning id into v_grupo;
  insert into alumnos_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Sofía', 'Martínez', '1155550004', true);
  insert into pedidos (id_grupo, estado_general, fecha_entrega_aproximada) values (v_grupo, 'Listo para entregar', '2027-03-20') returning id into v_pedido;
  insert into banderas_pedido (id_pedido, origen, estado_boceto, id_disenadora) values
    (v_pedido, 'Comprada', 'Confirmada', v_disenadora2);

  -- 5) Listo para enviar a producción (cruz) con dos banderas sin asignar.
  --    Sin responsable principal: el contacto tiene que salir "Sin datos".
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Banderas - Escuela 14', 'Temperley', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Primaria', 2027, 'Tarde', null) returning id into v_grupo;
  insert into padres_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Jorge', 'Ruiz', '1155550005', false);
  insert into pedidos (id_grupo, estado_general, fecha_entrega_aproximada) values (v_grupo, 'Listo para enviar a producción', '2027-03-25') returning id into v_pedido;
  insert into banderas_pedido (id_pedido, origen, estado_boceto) values
    (v_pedido, 'Beneficio', 'Sin respuesta'),
    (v_pedido, 'Beneficio', 'Pendiente de hablar');
end $$;


-- ─────────────────────────────────────────────────────────────
-- PARA BORRAR LOS DATOS DE PRUEBA (descomentar y correr)
-- ─────────────────────────────────────────────────────────────
-- delete from banderas_pedido where id_pedido in (select p.id from pedidos p join grupos g on g.id = p.id_grupo join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA Banderas%');
-- delete from pedidos where id_grupo in (select g.id from grupos g join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA Banderas%');
-- delete from alumnos_responsables where id_grupo in (select g.id from grupos g join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA Banderas%');
-- delete from padres_responsables where id_grupo in (select g.id from grupos g join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA Banderas%');
-- delete from grupos where id_colegio in (select id from colegios where nombre like 'PRUEBA Banderas%');
-- delete from colegios where nombre like 'PRUEBA Banderas%';
