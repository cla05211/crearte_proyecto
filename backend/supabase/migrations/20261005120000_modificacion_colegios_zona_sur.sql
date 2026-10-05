-- Zona Sur: indica si el colegio es de zona sur (retira el pedido) o del interior (envío).
-- Lo usa el envío de WhatsApp para elegir la plantilla de "pedido listo".
-- Los colegios que ya existen quedan en false (interior) hasta que se corrijan.

alter table public.colegios
    add column zona_sur boolean not null default false;
