-- Motivo por el que se cancela un pedido (baja del colegio). Se pide al cancelar desde Clientes > Datos.
-- Lista fija de motivos; si se agrega uno nuevo, hay que actualizar este check
-- y MOTIVOS_CANCELACION en el back (pedidos.service.ts) y en el front (gestion-pedidos-service.ts).
alter table public.pedidos
    add column if not exists motivo_cancelacion text;

alter table public.pedidos
    add constraint pedidos_motivo_cancelacion_check
    check (motivo_cancelacion is null or motivo_cancelacion in (
        'Pocos egresados',
        'Problemas con diseño',
        'Problemas con talles',
        'Otras cuestiones'
    ));
