ALTER TABLE "public"."notificaciones_whatsapp"
    ADD COLUMN "sector" text not null default 'pendiente'
        check (estado in ('Administración', 'Disenio', 'Talles'))