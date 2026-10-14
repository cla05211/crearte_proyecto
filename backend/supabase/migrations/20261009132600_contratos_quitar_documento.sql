alter table public.contratos
  drop constraint if exists contratos_documento_fkey;

alter table public.contratos
  drop column if exists documento;
