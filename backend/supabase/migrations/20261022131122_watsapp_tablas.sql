-- ─────────────────────────────────────────────────────────────────────────────
-- WPP Dashboard – Supabase Schema (consolidado, sin campañas)
-- Todo se crea dentro del schema "whatsapp", separado de las tablas de Crearte
-- (que están en "public"). Correr una sola vez (SQL Editor o como migración).
--
-- DESPUÉS de correrlo: Supabase → Project Settings → Data API →
-- "Exposed schemas" → agregar "whatsapp". Si no, la API no ve estas tablas.
-- ─────────────────────────────────────────────────────────────────────────────

create schema if not exists whatsapp;
set search_path to whatsapp, public, extensions;

-- wa_numbers: los números de WhatsApp de la empresa (uno por sector)
-- phone_number_id es el ID que muestra Meta (no el número de teléfono).
create table if not exists wa_numbers (
  id               uuid primary key default gen_random_uuid(),
  phone_number_id  text unique not null,     -- ID de Meta, ej. "1234567890123456"
  display_phone    text,                     -- ej. "+54 9 11 1234-5678"
  sector           text not null,            -- ej. "Talles", "Diseño", "Administración"
  active           boolean not null default true,
  created_at       timestamptz default now()
);

-- contacts: una fila por número de WhatsApp de cliente
create table if not exists contacts (
  id          uuid primary key default gen_random_uuid(),
  phone       text unique not null,          -- ej. "5491112345678"
  name        text,                          -- nombre del perfil de WhatsApp
  profile_pic text,
  opted_out   boolean not null default false, -- el contacto pidió la baja
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- conversations: un hilo por contacto Y por número de la empresa
-- (si un cliente le escribe a Talles y a Diseño son dos chats distintos)
create table if not exists conversations (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid references contacts(id) on delete cascade,
  phone_number_id  text,                     -- a qué número de la empresa pertenece (wa_numbers)
  last_message     text,
  last_message_at  timestamptz,
  unread_count     int default 0,
  status           text default 'open',      -- open | closed | pending
  archived         boolean not null default false,
  assignees        uuid[] not null default '{}', -- ids de auth.users asignados
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (contact_id, phone_number_id)
);

-- messages: cada mensaje de cada conversación
create table if not exists messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid references conversations(id) on delete cascade,
  wamid            text unique,              -- ID de WhatsApp (wamid.xxx)
  direction        text not null check (direction in ('inbound', 'outbound')),
  type             text not null,            -- text | image | audio | template | …
  content          jsonb not null default '{}',
  status           text default 'sent',      -- sent | delivered | read | failed
  created_at       timestamptz default now()
);

-- templates: copia local de las plantillas aprobadas en Meta
create table if not exists templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  language          text default 'es_AR',
  category          text,
  components        jsonb default '[]',
  status            text,                    -- APPROVED | PENDING | REJECTED
  meta_template_id  text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- etiquetas de chats
create table if not exists chat_tags (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  normalized_name text not null unique,
  color           text not null default '#00a884',
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz default now()
);

create table if not exists conversation_tags (
  conversation_id uuid not null references conversations(id) on delete cascade,
  tag_id          uuid not null references chat_tags(id) on delete cascade,
  primary key (conversation_id, tag_id)
);

-- ── Índices ──────────────────────────────────────────────────────────────────
create index if not exists idx_conversations_contact  on conversations(contact_id);
create index if not exists idx_conversations_number   on conversations(phone_number_id);
create index if not exists idx_conversations_updated  on conversations(last_message_at desc nulls last);
create index if not exists idx_messages_conversation  on messages(conversation_id);
create index if not exists idx_messages_created       on messages(created_at);
create index if not exists idx_conversation_tags_conv on conversation_tags(conversation_id);
create index if not exists idx_conversation_tags_tag  on conversation_tags(tag_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Cualquier usuario autenticado (en Crearte: los empleados) puede leer/escribir.
-- El webhook y las rutas del servidor usan la service-role key (saltea RLS).
-- IMPORTANTE: el registro público (signup) de Supabase Auth tiene que estar
-- desactivado, si no cualquiera que se registre ve todos los chats.
do $$
declare
  t text;
begin
  foreach t in array array[
    'wa_numbers', 'contacts', 'conversations', 'messages', 'templates',
    'chat_tags', 'conversation_tags'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "wpp_auth_all_%s" on %I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- ── Permisos del schema ──────────────────────────────────────────────────────
-- Los empleados logueados (authenticated) y el servidor (service_role) pueden
-- usar las tablas; RLS sigue aplicando para authenticated. anon no ve nada.
grant usage on schema whatsapp to authenticated, service_role;
grant all on all tables in schema whatsapp to authenticated, service_role;
grant all on all sequences in schema whatsapp to authenticated, service_role;
alter default privileges in schema whatsapp grant all on tables to authenticated, service_role;
alter default privileges in schema whatsapp grant all on sequences to authenticated, service_role;

-- ── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table whatsapp.conversations;
alter publication supabase_realtime add table whatsapp.messages;
alter publication supabase_realtime add table whatsapp.chat_tags;
alter publication supabase_realtime add table whatsapp.conversation_tags;
