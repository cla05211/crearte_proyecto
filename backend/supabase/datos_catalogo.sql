-- Datos iniciales de producción: solo catálogos (roles/permisos, productos, precios, beneficios, agregados).
-- Generado a partir de datos_iniciales.sql (que traía también datos de prueba de clientes y pedidos).

SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict W9bx9d7l9Iw2HcU9vMjBAPtjBwfGqXp8m1aycYE9l2qWSrxNV5PhhAmE5yrGFLj

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: agregados; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."agregados" ("id", "agregado", "precio", "individual") VALUES
	(36, 'Excepciones molderías buzo/campera', 20000.00, true),
	(37, 'Bordados en chomba (hasta 3)', 12000.00, true),
	(38, 'Boquillas (x2)', 5000.00, true),
	(39, 'Puños y cuello rayados', 8000.00, true),
	(41, '2 inscripciones', 6500.00, true),
	(42, '3 inscripciones', 10000.00, true),
	(44, 'Bordado media manga (flores u hojas) (por manga)', 15000.00, true),
	(45, 'Extra por chomba en piqué', 15000.00, true),
	(46, 'Líneas aplicadas en frente y espalda (onduladas)', 20000.00, true),
	(47, 'Ícono estampado personalizado (por prenda)', 15000.00, true),
	(48, 'Aplique bordado (relleno misma tela + festón bordado)', 9000.00, true),
	(49, 'Nombre + iniciales estampado', 9500.00, true),
	(50, 'Nombre + iniciales bordado', 14000.00, true),
	(51, 'Número distinto estampado', 10000.00, true),
	(52, 'Número distinto aplique', 19000.00, true),
	(53, 'Bandera 2.5 x 1.5 mt', 75000.00, false),
	(40, '1 inscripción', 3500, true);


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."roles" ("id", "rol", "nombre_rol") VALUES
	(4, 2, 'Ventas'),
	(5, 3, 'Talles'),
	(6, 4, 'Diseño'),
	(8, 6, 'Cliente'),
	(9, 7, 'Administración'),
	(3, 1, 'Supervisor'),
	(7, 5, 'Fábrica');


--
-- Data for Name: agregados_historial; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."agregados_historial" ("id", "id_agregado", "precio", "vigente_desde") OVERRIDING SYSTEM VALUE VALUES
	(1, 36, 20000.00, '-infinity'),
	(2, 37, 12000.00, '-infinity'),
	(3, 38, 5000.00, '-infinity'),
	(4, 39, 8000.00, '-infinity'),
	(5, 41, 6500.00, '-infinity'),
	(6, 42, 10000.00, '-infinity'),
	(7, 44, 15000.00, '-infinity'),
	(8, 45, 15000.00, '-infinity'),
	(9, 46, 20000.00, '-infinity'),
	(10, 47, 15000.00, '-infinity'),
	(11, 48, 9000.00, '-infinity'),
	(12, 49, 9500.00, '-infinity'),
	(13, 50, 14000.00, '-infinity'),
	(14, 51, 10000.00, '-infinity'),
	(15, 52, 19000.00, '-infinity'),
	(16, 53, 75000.00, '-infinity'),
	(17, 40, 3500, '-infinity');


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."productos" ("id", "nombre", "descripcion") VALUES
	(73, 'Bandera', 'Bandera 2.5 x 1.5 mt'),
	(63, 'Campera', 'Con recortes o lisa. Incluye 3 inscripciones bordadas o estampadas + puños rayados + 2 boquillas.'),
	(64, 'Buzo', 'Con recortes o liso. Incluye 3 inscripciones bordadas o estampadas + puños rayados + 2 boquillas.'),
	(65, 'Chomba', 'Lisa o con recortes. Incluye 3 inscripciones estampadas.'),
	(66, 'Remera', 'Lisa o con recortes. Incluye 3 inscripciones estampadas.'),
	(67, 'Combo: Campera y Chomba', 'Campera: Con recortes o lisa. Incluye: 3 inscripciones estampadas o bordadas + puños rayados + 2 boquillas
Chomba: Con recortes o lisa. Incluye: 3 inscripciones estampadas'),
	(68, 'Combo: Campera y Remera', 'Campera: Con recortes o lisa. Incluye: 3 inscripciones estampadas o bordadas + puños rayados + 2 boquillas
Remera: Con recortes o lisa. Incluye: 3 inscripciones estampadas'),
	(69, 'Combo: Buzo y Remera', 'Buzo: Con recortes o lisa. Incluye: 3 inscripciones estampadas o bordadas + puños rayados y 2 boquillas
Remera: Con recortes o lisa. Incluye: 3 inscripciones estampadas'),
	(70, 'Combo: Buzo y Chomba', 'Buzo: Con recortes o lisa. Incluye: 3 inscripciones estampadas o bordadas + puños rayados + 2 boquillas
Chomba: Con recortes o lisa. Incluye: 3 inscripciones estampadas'),
	(71, 'Campera Universitaria', 'Incluye: 3 inscripciones bordadas + cuello y puños tejidos rayados + broches plásticos + cierre.'),
	(72, 'Pantalón Jogging', 'Liso. Incluye: 2 inscripciones estampadas.');


--
-- Data for Name: beneficios; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."beneficios" ("id", "beneficio", "id_producto") VALUES
	(1, 'Bandera (2,5 x 1,5mt) ', NULL),
	(6, 'Rifas ', NULL),
	(7, 'Kit Upd', NULL),
	(2, 'Buzo liberado', 64),
	(3, 'Campera liberada', 63),
	(4, 'Chomba liberada', 65),
	(5, 'Remera liberada', 66);


--
-- Data for Name: permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."permisos" ("id", "nombre", "descripcion") VALUES
	(1, 'ver_usuarios', 'Ver la página de Usuarios. Incluye: Dar de alta, aprobar y eliminar usuarios.'),
	(2, 'crear_pedido', 'Puede guardar pedido inicial en el sistema, guardando asi colegio, grupo, datos padres y alumnos responsables, etc.'),
	(3, 'ver_productos', 'Puede ver la pagina de productos. Incluye: Agregar y modificar precios productos'),
	(4, 'modificar_pedidos', 'Puede modificar presupuesto, prendas y beneficios de un pedido'),
	(6, 'ver_bancos', 'Puede ver y descargar las planillas de los bancos'),
	(7, 'descargar_imagenes', 'Descargar imagenes '),
	(8, 'ver_caja', 'Puede ver la pagina de caja e ingresar movimientos'),
	(10, 'ver_clientes', 'puede ver la pagina general de clientes'),
	(11, 'ver_clientes_presupuesto', 'Ve, dentro de la pagina de clientes, el sector de presupuestos'),
	(12, 'ver_clientes_administrativo', 'Ve, dentro de la pagina de clientes, el sector administrativo'),
	(13, 'ver_clientes_talles_disenio', 'Ve, dentro de la pagina de clientes, el sector de talles y diseño'),
	(14, 'ver_clientes_datos', 'Ve, dentro de la pagina de clientes, los datos del colegio'),
	(15, 'ver_talles_disenio', 'acceso a la planilla de control de talles y diseño'),
	(16, 'ver_tabla_muestras_fisicas', 'Puede ver y modificar la tabla de muestras fisicas'),
	(18, 'ver_control_produccion', 'Ve la tabla de contro y produccion, puede marcar productos como entregados y enviar pedidos a fábrica'),
	(19, 'ver_pagina_productos', 'Puede ver la pagina de productos (modificar precios productos, agregar productos, agregar planes de pago, desactivar y activar planes de pago)'),
	(20, 'ver_banderas', 'Tiene acceso a la planilla de banderas'),
	(21, 'ver_deudores', 'Puede ver la planilla de colegios deudores'),
	(22, 'ver_auditoria', 'Ve la pagina de auditoria '),
	(23, 'ver_estadisticas', 'Tiene acceso a la pagina de estadisticas'),
	(24, 'ver_novedades_ventas', 'Ve las ventas realizadas en las ultimas 72 horas en la pagina de novedades'),
	(25, 'ver_novedades_produccion', 'Ve los pedidos listos para producir en la pagina de novedades'),
	(27, 'cancelar_pedido', 'Tiene permiso para cancelar un  pedido'),
	(28, 'ver_nombres_usuarios', 'Puede ver el listado de nombre de usuarios: vendedores y deiseñadoras, pero no puede modificar nada al respecto');


--
-- Data for Name: precios_productos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."precios_productos" ("id", "id_producto", "cantidad_desde", "cantidad_hasta", "cuotas", "valor_senia", "valor_cuota", "con_senia", "activo", "beneficios") VALUES
	(67, 69, 41, 999, 3, 10000.00, 48400.00, true, true, '[]'),
	(43, 67, 1, 25, 3, 11000.00, 48400.00, true, true, '[]'),
	(45, 67, 1, 25, 2, 46800.00, 46800.00, false, true, '[]'),
	(48, 67, 26, 40, 2, 46800.00, 46800.00, false, true, '[]'),
	(51, 67, 41, 999, 2, 46800.00, 46800.00, false, true, '[]'),
	(46, 67, 26, 40, 3, 10000.00, 48400.00, true, true, '[]'),
	(49, 67, 41, 999, 3, 10000.00, 48400.00, true, true, '[]'),
	(61, 69, 1, 25, 3, 11000.00, 48400.00, true, true, '[]'),
	(63, 69, 1, 25, 2, 46800.00, 46800.00, false, true, '[]'),
	(66, 69, 26, 40, 2, 46800.00, 46800.00, false, true, '[]'),
	(69, 69, 41, 999, 2, 46800.00, 46800.00, false, true, '[]'),
	(64, 69, 26, 40, 3, 10000.00, 48400.00, true, true, '[]'),
	(4, 63, 26, 40, 3, 10000.00, 29667.00, true, true, '[]'),
	(5, 63, 26, 40, 6, 10000.00, 17950.00, true, true, '[]'),
	(6, 63, 26, 40, 2, 29700.00, 29700.00, false, true, '[]'),
	(13, 64, 26, 40, 3, 10000.00, 29667.00, true, true, '[]'),
	(14, 64, 26, 40, 6, 10000.00, 17950.00, true, true, '[]'),
	(15, 64, 26, 40, 2, 29700.00, 29700.00, false, true, '[]'),
	(28, 71, 26, 40, 3, 10000.00, 35167.00, true, true, '[]'),
	(29, 71, 26, 40, 6, 10000.00, 21034.00, true, true, '[]'),
	(30, 71, 26, 40, 2, 35000.00, 35000.00, false, true, '[]'),
	(37, 72, 26, 40, 3, 10000.00, 17700.00, true, true, '[]'),
	(38, 72, 26, 40, 6, 10000.00, 10743.00, true, true, '[]'),
	(39, 72, 26, 40, 2, 19000.00, 19000.00, false, true, '[]'),
	(47, 67, 26, 40, 6, 10000.00, 27534.00, true, true, '[]'),
	(56, 68, 26, 40, 6, 10000.00, 27534.00, true, true, '[]'),
	(65, 69, 26, 40, 6, 10000.00, 27534.00, true, true, '[]'),
	(74, 70, 26, 40, 6, 10000.00, 27534.00, true, true, '[]'),
	(7, 63, 41, 999, 3, 10000.00, 29667.00, true, true, '[]'),
	(2, 63, 1, 25, 6, 10000.00, 17950.00, true, true, '[]'),
	(3, 63, 1, 25, 2, 29700.00, 29700.00, false, true, '[]'),
	(10, 64, 1, 25, 3, 10000.00, 29667.00, true, true, '[]'),
	(11, 64, 1, 25, 6, 10000.00, 17950.00, true, true, '[]'),
	(12, 64, 1, 25, 2, 29700.00, 29700.00, false, true, '[]'),
	(22, 66, 1, 999, 3, 10000.00, 13734.00, true, true, '[]'),
	(23, 66, 1, 999, 6, 10000.00, 7918.00, true, true, '[]'),
	(24, 66, 1, 999, 2, 14300.00, 14300.00, false, true, '[]'),
	(59, 68, 41, 999, 6, 10000.00, 27534.00, true, true, '[]'),
	(25, 71, 1, 25, 3, 10000.00, 35167.00, true, true, '[]'),
	(26, 71, 1, 25, 6, 10000.00, 21034.00, true, true, '[]'),
	(87, 71, 1, 25, 1, 52500.00, 52500.00, false, true, '[]'),
	(34, 72, 1, 25, 3, 10000.00, 17700.00, true, true, '[]'),
	(35, 72, 1, 25, 6, 10000.00, 10743.00, true, true, '[]'),
	(44, 67, 1, 25, 6, 10000.00, 27534.00, true, true, '[]'),
	(36, 72, 1, 25, 2, 19000.00, 19000.00, false, true, '[]'),
	(62, 69, 1, 25, 6, 10000.00, 27534.00, true, true, '[]'),
	(71, 70, 1, 25, 6, 10000.00, 27534.00, true, true, '[]'),
	(53, 68, 1, 25, 6, 10000.00, 27534.00, true, true, '[]'),
	(8, 63, 41, 999, 6, 10000.00, 17950.00, true, true, '[]'),
	(9, 63, 41, 999, 2, 29700.00, 29700.00, false, true, '[]'),
	(1, 63, 1, 25, 3, 10000.00, 29667.00, true, true, '[]'),
	(16, 64, 41, 999, 3, 10000.00, 29667.00, true, true, '[]'),
	(17, 64, 41, 999, 6, 10000.00, 17950.00, true, true, '[]'),
	(18, 64, 41, 999, 2, 29700.00, 29700.00, false, true, '[]'),
	(19, 65, 1, 999, 3, 10000.00, 13734.00, true, true, '[]'),
	(31, 71, 41, 999, 3, 10000.00, 34068.00, true, true, '[]'),
	(21, 65, 1, 999, 2, 14300.00, 14300.00, false, true, '[]'),
	(20, 65, 1, 999, 6, 10000.00, 7918.00, true, true, '[]'),
	(32, 71, 41, 999, 6, 10000.00, 20400.00, true, true, '[]'),
	(33, 71, 41, 999, 2, 33334.00, 33334.00, false, true, '[]'),
	(42, 72, 41, 999, 2, 16334.00, 16334.00, false, true, '[]'),
	(41, 72, 41, 999, 6, 10000.00, 8560.00, true, true, '[]'),
	(40, 72, 41, 999, 3, 10000.00, 14000.00, true, true, '[]'),
	(50, 67, 41, 999, 6, 10000.00, 27534.00, true, true, '[]'),
	(68, 69, 41, 999, 6, 10000.00, 27534.00, true, true, '[]'),
	(77, 70, 41, 999, 6, 10000.00, 27534.00, true, true, '[]'),
	(27, 71, 1, 25, 2, 35000.00, 35000.00, false, true, '[]'),
	(80, 63, 26, 40, 1, 44550.00, 44550.00, false, true, '[]'),
	(70, 70, 1, 25, 3, 11000.00, 48400.00, true, true, '[]'),
	(72, 70, 1, 25, 2, 46800.00, 46800.00, false, true, '[]'),
	(75, 70, 26, 40, 2, 46800.00, 46800.00, false, true, '[]'),
	(78, 70, 41, 999, 2, 46800.00, 46800.00, false, true, '[]'),
	(73, 70, 26, 40, 3, 10000.00, 48400.00, true, true, '[]'),
	(76, 70, 41, 999, 3, 10000.00, 48400.00, true, true, '[]'),
	(52, 68, 1, 25, 3, 11000.00, 48400.00, true, true, '[]'),
	(54, 68, 1, 25, 2, 46800.00, 46800.00, false, true, '[]'),
	(57, 68, 26, 40, 2, 46800.00, 46800.00, false, true, '[]'),
	(60, 68, 41, 999, 2, 46800.00, 46800.00, false, true, '[]'),
	(55, 68, 26, 40, 3, 10000.00, 48400.00, true, true, '[]'),
	(58, 68, 41, 999, 3, 10000.00, 48400.00, true, true, '[]'),
	(83, 64, 26, 40, 1, 44550.00, 44550.00, false, true, '[]'),
	(88, 71, 26, 40, 1, 52500.00, 52500.00, false, true, '[]'),
	(91, 72, 26, 40, 1, 28500.00, 28500.00, false, true, '[]'),
	(89, 71, 41, 999, 1, 50001.00, 50001.00, false, true, '[]'),
	(85, 65, 1, 55, 1, 21450.00, 21450.00, false, true, '[]'),
	(82, 64, 1, 25, 1, 44550.00, 44550.00, false, true, '[]'),
	(79, 63, 1, 25, 1, 44550.00, 44550.00, false, true, '[]'),
	(81, 63, 41, 999, 1, 44550.00, 44550.00, false, true, '[]'),
	(84, 64, 41, 999, 1, 44550.00, 44550.00, false, true, '[]'),
	(90, 72, 1, 25, 1, 28500.00, 28500.00, false, true, '[]'),
	(92, 72, 41, 999, 1, 24501.00, 24501.00, false, true, '[]'),
	(93, 67, 1, 25, 1, 70200.00, 70200.00, false, true, '[]'),
	(95, 67, 41, 999, 1, 70200.00, 70200.00, false, true, '[]'),
	(94, 67, 26, 40, 1, 70200.00, 70200.00, false, true, '[]'),
	(99, 69, 1, 25, 1, 70200.00, 70200.00, false, true, '[]'),
	(101, 69, 41, 55, 1, 70200.00, 70200.00, false, true, '[]'),
	(100, 69, 26, 999, 1, 70200.00, 70200.00, false, true, '[]'),
	(103, 70, 26, 40, 1, 70200.00, 70200.00, false, true, '[]'),
	(96, 68, 1, 25, 1, 70200.00, 70200.00, false, true, '[]'),
	(98, 68, 41, 999, 1, 70200.00, 70200.00, false, true, '[]'),
	(97, 68, 26, 40, 1, 70200.00, 70200.00, false, true, '[]'),
	(104, 70, 41, 999, 1, 70200.00, 70200.00, false, true, '[]'),
	(102, 70, 1, 25, 1, 70200.00, 70200.00, false, true, '[]'),
	(86, 66, 1, 999, 1, 21450.00, 21450.00, false, true, '[]');


--
-- Data for Name: precios_productos_historial; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."precios_productos_historial" ("id", "id_precio_producto", "id_producto", "cantidad_desde", "cantidad_hasta", "cuotas", "con_senia", "valor_senia", "valor_cuota", "vigente_desde", "beneficios") OVERRIDING SYSTEM VALUE VALUES
	(1, 67, 69, 41, 999, 3, true, 10000.00, 48400.00, '-infinity', '[]'),
	(2, 43, 67, 1, 25, 3, true, 11000.00, 48400.00, '-infinity', '[]'),
	(3, 45, 67, 1, 25, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(4, 48, 67, 26, 40, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(5, 51, 67, 41, 999, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(6, 46, 67, 26, 40, 3, true, 10000.00, 48400.00, '-infinity', '[]'),
	(7, 49, 67, 41, 999, 3, true, 10000.00, 48400.00, '-infinity', '[]'),
	(8, 61, 69, 1, 25, 3, true, 11000.00, 48400.00, '-infinity', '[]'),
	(9, 63, 69, 1, 25, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(10, 66, 69, 26, 40, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(11, 69, 69, 41, 999, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(12, 64, 69, 26, 40, 3, true, 10000.00, 48400.00, '-infinity', '[]'),
	(13, 4, 63, 26, 40, 3, true, 10000.00, 29667.00, '-infinity', '[]'),
	(14, 5, 63, 26, 40, 6, true, 10000.00, 17950.00, '-infinity', '[]'),
	(15, 6, 63, 26, 40, 2, false, 29700.00, 29700.00, '-infinity', '[]'),
	(16, 13, 64, 26, 40, 3, true, 10000.00, 29667.00, '-infinity', '[]'),
	(17, 14, 64, 26, 40, 6, true, 10000.00, 17950.00, '-infinity', '[]'),
	(18, 15, 64, 26, 40, 2, false, 29700.00, 29700.00, '-infinity', '[]'),
	(19, 28, 71, 26, 40, 3, true, 10000.00, 35167.00, '-infinity', '[]'),
	(20, 29, 71, 26, 40, 6, true, 10000.00, 21034.00, '-infinity', '[]'),
	(21, 30, 71, 26, 40, 2, false, 35000.00, 35000.00, '-infinity', '[]'),
	(22, 37, 72, 26, 40, 3, true, 10000.00, 17700.00, '-infinity', '[]'),
	(23, 38, 72, 26, 40, 6, true, 10000.00, 10743.00, '-infinity', '[]'),
	(24, 39, 72, 26, 40, 2, false, 19000.00, 19000.00, '-infinity', '[]'),
	(25, 47, 67, 26, 40, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(26, 56, 68, 26, 40, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(27, 65, 69, 26, 40, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(28, 74, 70, 26, 40, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(29, 7, 63, 41, 999, 3, true, 10000.00, 29667.00, '-infinity', '[]'),
	(30, 2, 63, 1, 25, 6, true, 10000.00, 17950.00, '-infinity', '[]'),
	(31, 3, 63, 1, 25, 2, false, 29700.00, 29700.00, '-infinity', '[]'),
	(32, 10, 64, 1, 25, 3, true, 10000.00, 29667.00, '-infinity', '[]'),
	(33, 11, 64, 1, 25, 6, true, 10000.00, 17950.00, '-infinity', '[]'),
	(34, 12, 64, 1, 25, 2, false, 29700.00, 29700.00, '-infinity', '[]'),
	(35, 22, 66, 1, 999, 3, true, 10000.00, 13734.00, '-infinity', '[]'),
	(36, 23, 66, 1, 999, 6, true, 10000.00, 7918.00, '-infinity', '[]'),
	(37, 24, 66, 1, 999, 2, false, 14300.00, 14300.00, '-infinity', '[]'),
	(38, 59, 68, 41, 999, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(39, 25, 71, 1, 25, 3, true, 10000.00, 35167.00, '-infinity', '[]'),
	(40, 26, 71, 1, 25, 6, true, 10000.00, 21034.00, '-infinity', '[]'),
	(41, 87, 71, 1, 25, 1, false, 52500.00, 52500.00, '-infinity', '[]'),
	(42, 34, 72, 1, 25, 3, true, 10000.00, 17700.00, '-infinity', '[]'),
	(43, 35, 72, 1, 25, 6, true, 10000.00, 10743.00, '-infinity', '[]'),
	(44, 44, 67, 1, 25, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(45, 36, 72, 1, 25, 2, false, 19000.00, 19000.00, '-infinity', '[]'),
	(46, 62, 69, 1, 25, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(47, 71, 70, 1, 25, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(48, 53, 68, 1, 25, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(49, 8, 63, 41, 999, 6, true, 10000.00, 17950.00, '-infinity', '[]'),
	(50, 9, 63, 41, 999, 2, false, 29700.00, 29700.00, '-infinity', '[]'),
	(51, 1, 63, 1, 25, 3, true, 10000.00, 29667.00, '-infinity', '[]'),
	(52, 16, 64, 41, 999, 3, true, 10000.00, 29667.00, '-infinity', '[]'),
	(53, 17, 64, 41, 999, 6, true, 10000.00, 17950.00, '-infinity', '[]'),
	(54, 18, 64, 41, 999, 2, false, 29700.00, 29700.00, '-infinity', '[]'),
	(55, 19, 65, 1, 999, 3, true, 10000.00, 13734.00, '-infinity', '[]'),
	(56, 31, 71, 41, 999, 3, true, 10000.00, 34068.00, '-infinity', '[]'),
	(57, 21, 65, 1, 999, 2, false, 14300.00, 14300.00, '-infinity', '[]'),
	(58, 20, 65, 1, 999, 6, true, 10000.00, 7918.00, '-infinity', '[]'),
	(59, 32, 71, 41, 999, 6, true, 10000.00, 20400.00, '-infinity', '[]'),
	(60, 33, 71, 41, 999, 2, false, 33334.00, 33334.00, '-infinity', '[]'),
	(61, 42, 72, 41, 999, 2, false, 16334.00, 16334.00, '-infinity', '[]'),
	(62, 41, 72, 41, 999, 6, true, 10000.00, 8560.00, '-infinity', '[]'),
	(63, 40, 72, 41, 999, 3, true, 10000.00, 14000.00, '-infinity', '[]'),
	(64, 50, 67, 41, 999, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(65, 68, 69, 41, 999, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(66, 77, 70, 41, 999, 6, true, 10000.00, 27534.00, '-infinity', '[]'),
	(67, 27, 71, 1, 25, 2, false, 35000.00, 35000.00, '-infinity', '[]'),
	(68, 80, 63, 26, 40, 1, false, 44550.00, 44550.00, '-infinity', '[]'),
	(69, 70, 70, 1, 25, 3, true, 11000.00, 48400.00, '-infinity', '[]'),
	(70, 72, 70, 1, 25, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(71, 75, 70, 26, 40, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(72, 78, 70, 41, 999, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(73, 73, 70, 26, 40, 3, true, 10000.00, 48400.00, '-infinity', '[]'),
	(74, 76, 70, 41, 999, 3, true, 10000.00, 48400.00, '-infinity', '[]'),
	(75, 52, 68, 1, 25, 3, true, 11000.00, 48400.00, '-infinity', '[]'),
	(76, 54, 68, 1, 25, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(77, 57, 68, 26, 40, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(78, 60, 68, 41, 999, 2, false, 46800.00, 46800.00, '-infinity', '[]'),
	(79, 55, 68, 26, 40, 3, true, 10000.00, 48400.00, '-infinity', '[]'),
	(80, 58, 68, 41, 999, 3, true, 10000.00, 48400.00, '-infinity', '[]'),
	(81, 83, 64, 26, 40, 1, false, 44550.00, 44550.00, '-infinity', '[]'),
	(82, 88, 71, 26, 40, 1, false, 52500.00, 52500.00, '-infinity', '[]'),
	(83, 91, 72, 26, 40, 1, false, 28500.00, 28500.00, '-infinity', '[]'),
	(84, 89, 71, 41, 999, 1, false, 50001.00, 50001.00, '-infinity', '[]'),
	(85, 85, 65, 1, 55, 1, false, 21450.00, 21450.00, '-infinity', '[]'),
	(86, 82, 64, 1, 25, 1, false, 44550.00, 44550.00, '-infinity', '[]'),
	(87, 79, 63, 1, 25, 1, false, 44550.00, 44550.00, '-infinity', '[]'),
	(88, 81, 63, 41, 999, 1, false, 44550.00, 44550.00, '-infinity', '[]'),
	(89, 84, 64, 41, 999, 1, false, 44550.00, 44550.00, '-infinity', '[]'),
	(90, 90, 72, 1, 25, 1, false, 28500.00, 28500.00, '-infinity', '[]'),
	(91, 92, 72, 41, 999, 1, false, 24501.00, 24501.00, '-infinity', '[]'),
	(92, 93, 67, 1, 25, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(93, 95, 67, 41, 999, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(94, 94, 67, 26, 40, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(95, 99, 69, 1, 25, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(96, 101, 69, 41, 55, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(97, 100, 69, 26, 999, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(98, 103, 70, 26, 40, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(99, 96, 68, 1, 25, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(100, 98, 68, 41, 999, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(101, 97, 68, 26, 40, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(102, 104, 70, 41, 999, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(103, 102, 70, 1, 25, 1, false, 70200.00, 70200.00, '-infinity', '[]'),
	(104, 86, 66, 1, 999, 1, false, 21450.00, 21450.00, '-infinity', '[]');


--
-- Data for Name: producto_componentes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."producto_componentes" ("id", "id_producto_combo", "id_producto_componente", "cantidad") VALUES
	(1, 67, 63, 1),
	(2, 67, 65, 1),
	(3, 68, 63, 1),
	(4, 68, 66, 1),
	(5, 69, 64, 1),
	(6, 69, 66, 1),
	(7, 70, 64, 1),
	(8, 70, 65, 1);


--
-- Data for Name: roles_permisos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."roles_permisos" ("id", "rol_nro", "permiso_id") VALUES
	(1, 1, 1),
	(2, 1, 2),
	(3, 2, 2),
	(6, 1, 3),
	(7, 2, 3),
	(8, 7, 3),
	(9, 1, 4),
	(11, 2, 4),
	(12, 7, 4),
	(13, 4, 4),
	(14, 3, 4),
	(15, 1, 6),
	(16, 7, 6),
	(17, 1, 7),
	(18, 7, 7),
	(20, 1, 8),
	(21, 7, 8),
	(23, 1, 10),
	(24, 2, 10),
	(25, 3, 10),
	(26, 4, 10),
	(27, 5, 10),
	(28, 7, 10),
	(29, 1, 11),
	(30, 2, 11),
	(31, 4, 11),
	(32, 7, 11),
	(33, 1, 12),
	(34, 7, 12),
	(35, 1, 13),
	(36, 3, 13),
	(37, 4, 13),
	(38, 7, 13),
	(39, 5, 13),
	(40, 1, 14),
	(41, 2, 14),
	(42, 3, 14),
	(43, 4, 14),
	(44, 7, 14),
	(45, 1, 15),
	(46, 4, 15),
	(47, 3, 15),
	(48, 3, 16),
	(49, 1, 16),
	(51, 1, 18),
	(52, 7, 18),
	(53, 1, 19),
	(54, 4, 20),
	(55, 1, 20),
	(56, 7, 21),
	(57, 1, 21),
	(58, 1, 22),
	(59, 1, 23),
	(60, 1, 24),
	(61, 3, 24),
	(62, 4, 24),
	(63, 7, 24),
	(64, 1, 25),
	(65, 7, 25),
	(67, 1, 27),
	(68, 7, 27),
	(69, 1, 28),
	(71, 2, 28),
	(73, 3, 28),
	(74, 4, 28),
	(75, 7, 28);


--
-- Name: agregados_historial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."agregados_historial_id_seq"', 17, true);


--
-- Name: agregados_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."agregados_id_seq"', 53, true);


--
-- Name: beneficios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."beneficios_id_seq"', 7, true);


--
-- Name: combos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."combos_id_seq"', 73, true);


--
-- Name: permisos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."permisos_id_seq"', 28, true);


--
-- Name: precios_productos_historial_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."precios_productos_historial_id_seq"', 104, true);


--
-- Name: precios_productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."precios_productos_id_seq"', 104, true);


--
-- Name: producto_componentes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."producto_componentes_id_seq"', 8, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."roles_id_seq"', 9, true);


--
-- Name: roles_permisos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."roles_permisos_id_seq"', 75, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict W9bx9d7l9Iw2HcU9vMjBAPtjBwfGqXp8m1aycYE9l2qWSrxNV5PhhAmE5yrGFLj

RESET ALL;
