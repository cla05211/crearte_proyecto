alter table public.padres_responsables
  add column if not exists firmo_contrato boolean;
ALTER TABLE public.padres_responsables
ADD COLUMN IF NOT EXISTS firma bigint,
ADD CONSTRAINT fk_firma
FOREIGN KEY (firma)
REFERENCES public.documentos(id);