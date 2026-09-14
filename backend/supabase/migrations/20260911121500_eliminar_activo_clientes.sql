-- La migración que crea "clientes" se aplicó con la columna "activo",
-- pero se decidió no usarla (no había necesidad real todavía) y se sacó
-- del archivo de la migración original. Esto la saca también de la base
-- real para que quede alineado.

alter table "public"."clientes" drop column if exists "activo";
