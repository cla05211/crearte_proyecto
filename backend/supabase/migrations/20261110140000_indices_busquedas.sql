-- Índices para los filtros y búsquedas más usados.
-- Un índice es como el índice de un libro: en vez de leer la tabla entera para encontrar las filas
-- que cumplen el filtro, Postgres va directo a ellas. Con pocas filas no se nota; con miles, sí.

-- Búsqueda de colegios por texto (ilike '%texto%'): un índice común no sirve para "contiene";
-- pg_trgm parte el texto en trigramas y permite usar índice también en ese caso.
create extension if not exists pg_trgm with schema extensions;

create index if not exists colegios_nombre_trgm_idx    on public.colegios using gin (nombre extensions.gin_trgm_ops);
create index if not exists colegios_localidad_trgm_idx on public.colegios using gin (localidad extensions.gin_trgm_ops);

-- Filtros por fecha de venta y promo (Ventas, Clientes, Talles y diseño, Banderas, Estadísticas)
create index if not exists grupos_created_at_idx on public.grupos (created_at);
create index if not exists grupos_promo_idx      on public.grupos (promo);

-- Fecha de entrega (Control fábrica)
create index if not exists pedidos_fecha_entrega_aproximada_idx on public.pedidos (fecha_entrega_aproximada);

-- Pagos por fecha y banco (Cuentas bancarias, totales del mes, estadísticas de bancos)
create index if not exists pagos_banco_fecha_idx on public.pagos (banco, fecha);

-- Claves foráneas que no tenían índice
create index if not exists agregados_globales_pedido_id_pedido_idx on public.agregados_globales_pedido (id_pedido);
create index if not exists muestras_fisicas_id_pedido_idx          on public.muestras_fisicas (id_pedido);
create index if not exists sesiones_clientes_id_cliente_idx        on public.sesiones_clientes (id_cliente);
create index if not exists notificaciones_whatsapp_id_pedido_idx   on public.notificaciones_whatsapp (id_pedido);
create index if not exists notificaciones_whatsapp_pendientes_idx  on public.notificaciones_whatsapp (estado, plantilla, fecha_programada);
