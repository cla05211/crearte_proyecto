CREATE INDEX IF NOT EXISTS idx_grupos_id_colegio ON public.grupos (id_colegio);
CREATE INDEX IF NOT EXISTS idx_alumnos_responsables_id_grupo ON public.alumnos_responsables (id_grupo);
CREATE INDEX IF NOT EXISTS idx_padres_responsables_id_grupo ON public.padres_responsables (id_grupo);
CREATE INDEX IF NOT EXISTS idx_documentos_id_grupo ON public.documentos (id_grupo);
CREATE INDEX IF NOT EXISTS idx_movimientos_id_grupo ON public.movimientos (id_grupo);
CREATE INDEX IF NOT EXISTS idx_contratos_grupo ON public.contratos (grupo);
CREATE INDEX IF NOT EXISTS idx_pedidos_id_grupo ON public.pedidos (id_grupo);
CREATE INDEX IF NOT EXISTS idx_cuotas_id_pedido ON public.cuotas (id_pedido);
CREATE INDEX IF NOT EXISTS idx_pagos_id_pedido ON public.pagos (id_pedido);
CREATE INDEX IF NOT EXISTS idx_productos_pedidos_id_pedido ON public.productos_pedidos (id_pedido);
CREATE INDEX IF NOT EXISTS idx_prendas_pedido_pedido ON public.prendas_pedido (pedido);
CREATE INDEX IF NOT EXISTS idx_precios_productos_id_producto ON public.precios_productos (id_producto);

CREATE INDEX IF NOT EXISTS idx_colegios_nombre_localidad ON public.colegios (nombre, localidad);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_general ON public.pedidos (estado_general);