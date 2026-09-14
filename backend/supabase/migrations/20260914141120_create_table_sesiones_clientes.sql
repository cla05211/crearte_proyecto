create table sesiones_clientes (
  id uuid primary key default gen_random_uuid(),
  id_cliente int not null references clientes(id) on delete cascade,
  token_hash text not null unique,
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null
);
create index on sesiones_clientes(token_hash);