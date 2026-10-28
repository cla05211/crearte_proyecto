-- DATOS DE PRUEBA para ver la pestaña de Deudores.
-- Correrlo en el SQL Editor de Supabase. NO es una migración: no ponerlo en supabase/migrations.
-- Todos los colegios empiezan con "PRUEBA Deudores" para poder borrarlos con el script de abajo.
-- Las fechas son relativas a current_date, así que sirve aunque lo corras otro día.
--
-- Qué se tendría que ver (de arriba hacia abajo):
--   1. Escuela Técnica 2   → 3 cuotas, 90 días, $1.350.000, nro 99001   (ROJO)
--   2. Normal Mixta        → 2 cuotas, 45 días, $650.000 (una parcial)  (ROJO)
--   3. Colegio Nacional    → 1 cuota, 10 días, $500.000                 (desempata por monto)
--   4. San José            → 1 cuota, 10 días, $300.000, nro 99002
--   5. Instituto Mariano   → 1 cuota parcial, 5 días, $150.000
-- Y NO tienen que aparecer:
--   - Colegio Al Día       → cuotas vencidas todas pagadas + una pendiente futura
--   - Vence Hoy            → su única cuota pendiente vence hoy (todavía no está atrasada)
-- Nota: nro_fabrica es UNIQUE; se usan 99001/99002 para no chocar con pedidos reales.

do $$
declare
  v_colegio bigint;
  v_grupo bigint;
  v_pedido bigint;
begin
  -- 1) Tres cuotas vencidas sin pagar (90, 60 y 30 días) + una vieja ya pagada que NO cuenta
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Deudores - Escuela Técnica 2', 'Quilmes', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Secundaria', 2026, 'Mañana', 'Técnica') returning id into v_grupo;
  insert into padres_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Carolina', 'Benítez', '1155551001', true);
  insert into pedidos (id_grupo, estado_general, nro_fabrica) values (v_grupo, 'En producción', 99001) returning id into v_pedido;
  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado, monto_cubierto) values
    (v_pedido, 1, current_date - 120, 450000, 'Pagada',    450000),
    (v_pedido, 2, current_date - 90,  450000, 'Pendiente', 0),
    (v_pedido, 3, current_date - 60,  450000, 'Pendiente', 0),
    (v_pedido, 4, current_date - 30,  450000, 'Pendiente', 0),
    (v_pedido, 5, current_date + 30,  450000, 'Pendiente', 0);

  -- 2) Dos cuotas vencidas, una pagada a medias: 400.000 - 150.000 + 400.000 = 650.000
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Deudores - Normal Mixta', 'Lomas de Zamora', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Secundaria', 2026, 'Tarde', 'Sociales') returning id into v_grupo;
  insert into padres_responsables (id_grupo, nombre, apellido, telefono, principal) values
    (v_grupo, 'Diego', 'Fernández', '1155551002', true),
    (v_grupo, 'Paula', 'Suárez',    '1155551012', false);
  insert into pedidos (id_grupo) values (v_grupo) returning id into v_pedido;
  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado, monto_cubierto) values
    (v_pedido, 1, current_date - 45, 400000, 'Parcial',   150000),
    (v_pedido, 2, current_date - 15, 400000, 'Pendiente', 0),
    (v_pedido, 3, current_date + 15, 400000, 'Pendiente', 0);

  -- 3) Una cuota, 10 días, monto más alto (tiene que quedar arriba del San José, que tiene los mismos días)
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Deudores - Colegio Nacional', 'Banfield', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Secundaria', 2026, 'Mañana', 'Economía') returning id into v_grupo;
  insert into padres_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Marcela', 'Ríos', '1155551003', true);
  insert into pedidos (id_grupo) values (v_grupo) returning id into v_pedido;
  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado, monto_cubierto) values
    (v_pedido, 1, current_date - 10, 500000, 'Pendiente', 0),
    (v_pedido, 2, current_date + 20, 500000, 'Pendiente', 0);

  -- 4) Una cuota, 10 días, monto más bajo, con nro de pedido
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Deudores - San José', 'Adrogué', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Primaria', 2026, 'Tarde', null) returning id into v_grupo;
  insert into padres_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Héctor', 'Molina', '1155551004', true);
  insert into pedidos (id_grupo, estado_general, nro_fabrica) values (v_grupo, 'En producción', 99002) returning id into v_pedido;
  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado, monto_cubierto) values
    (v_pedido, 1, current_date - 40, 300000, 'Pagada',    300000),
    (v_pedido, 2, current_date - 10, 300000, 'Pendiente', 0);

  -- 5) Una sola cuota parcial vencida hace 5 días: 250.000 - 100.000 = 150.000
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Deudores - Instituto Mariano', 'Temperley', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Secundaria', 2026, 'Mañana', 'Naturales') returning id into v_grupo;
  insert into padres_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Natalia', 'Acosta', '1155551005', true);
  insert into pedidos (id_grupo) values (v_grupo) returning id into v_pedido;
  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado, monto_cubierto) values
    (v_pedido, 1, current_date - 5,  250000, 'Parcial',   100000),
    (v_pedido, 2, current_date + 25, 250000, 'Pendiente', 0);

  -- 6) NO DEBE APARECER: todo lo vencido está pagado, solo debe una cuota futura
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Deudores - Colegio Al Día', 'Bernal', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Secundaria', 2026, 'Tarde', 'Arte') returning id into v_grupo;
  insert into padres_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Rodrigo', 'Vega', '1155551006', true);
  insert into pedidos (id_grupo) values (v_grupo) returning id into v_pedido;
  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado, monto_cubierto) values
    (v_pedido, 1, current_date - 60, 350000, 'Pagada',    350000),
    (v_pedido, 2, current_date - 30, 350000, 'Pagada',    350000),
    (v_pedido, 3, current_date + 10, 350000, 'Pendiente', 0);

  -- 7) NO DEBE APARECER: la cuota pendiente vence hoy
  insert into colegios (nombre, localidad, provincia) values ('PRUEBA Deudores - Vence Hoy', 'Lanús', 'Buenos Aires') returning id into v_colegio;
  insert into grupos (id_colegio, nivel, promo, turno, orientacion) values (v_colegio, 'Primaria', 2026, 'Mañana', null) returning id into v_grupo;
  insert into padres_responsables (id_grupo, nombre, apellido, telefono, principal) values (v_grupo, 'Silvina', 'Ortiz', '1155551007', true);
  insert into pedidos (id_grupo) values (v_grupo) returning id into v_pedido;
  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado, monto_cubierto) values
    (v_pedido, 1, current_date, 200000, 'Pendiente', 0);
end $$;


-- ─────────────────────────────────────────────────────────────
-- PARA BORRAR LOS DATOS DE PRUEBA (descomentar y correr)
-- ─────────────────────────────────────────────────────────────
-- delete from cuotas where id_pedido in (select p.id from pedidos p join grupos g on g.id = p.id_grupo join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA Deudores%');
-- delete from pedidos where id_grupo in (select g.id from grupos g join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA Deudores%');
-- delete from padres_responsables where id_grupo in (select g.id from grupos g join colegios c on c.id = g.id_colegio where c.nombre like 'PRUEBA Deudores%');
-- delete from grupos where id_colegio in (select id from colegios where nombre like 'PRUEBA Deudores%');
-- delete from colegios where nombre like 'PRUEBA Deudores%';
