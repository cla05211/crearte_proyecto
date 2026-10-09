-- Quita de contratos la columna documento (FK a documentos).
-- Al borrar la columna se elimina también la constraint contratos_documento_fkey.

alter table public.contratos
  drop constraint if exists contratos_documento_fkey;

alter table public.contratos
  drop column if exists documento;
