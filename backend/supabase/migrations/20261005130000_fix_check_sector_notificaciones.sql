-- Corrige 20261001141348_tabla_mensajes_agregar_sector.sql:
-- el check se había aplicado sobre "estado" en lugar de "sector" (y sector tenía default 'pendiente'),
-- por lo que cualquier insert fallaba con "notificaciones_whatsapp_estado_check1".

alter table public.notificaciones_whatsapp
    drop constraint if exists notificaciones_whatsapp_estado_check1;

alter table public.notificaciones_whatsapp
    alter column sector drop default;

alter table public.notificaciones_whatsapp
    add constraint notificaciones_whatsapp_sector_check
    check (sector in ('Administración', 'Disenio', 'Talles'));
