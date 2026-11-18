

create table if not exists public.pedidos_envio (
  id bigint generated always as identity primary key,
  id_pedido bigint not null unique references public.pedidos(id) on delete cascade,

  estado text not null default 'Pendiente de hablar'
    check (estado in ('Pendiente de hablar', 'Hable', 'Paga interés', 'Cliente demorado')),
  -- 'Efectivo' solo para retiro por oficina / comisionista
  pago_realizado text not null default 'No'
    check (pago_realizado in ('Sí', 'No', 'Efectivo')),
  forma_entrega text not null
    check (forma_entrega in ('Envio', 'Retiro oficina', 'Comisionista')),


  cant_bultos int check (cant_bultos > 0),
  empresa_envio text check (empresa_envio in ('Via cargo', 'Andreani')),
  datos_envio boolean not null default false,
  cotizacion numeric check (cotizacion >= 0),                       -- precio del envío
  id_comprobante bigint references public.documentos(id) on delete set null, -- solo Via cargo
  -- Egreso en caja que genera la cotización de un envío gratis
  id_movimiento_caja bigint references public.movimientos_caja(id) on delete set null,


  calendario text not null default 'Pendiente'
    check (calendario in ('Agendado', 'Pendiente', 'Comisionista')),
    
  fecha_entrega date,
  entregado boolean not null default false,

  created_at timestamptz not null default now(),

  constraint pedidos_envio_efectivo_no_envio
    check (pago_realizado <> 'Efectivo' or forma_entrega <> 'Envio'),
  constraint pedidos_envio_comprobante_solo_via_cargo
    check (id_comprobante is null or empresa_envio = 'Via cargo'),
  constraint pedidos_envio_entregado_con_fecha
    check (not entregado or fecha_entrega is not null)
);

create index if not exists pedidos_envio_pendientes_idx on public.pedidos_envio (forma_entrega) where not entregado;
create index if not exists pedidos_envio_id_comprobante_idx on public.pedidos_envio (id_comprobante);
create index if not exists pedidos_envio_id_movimiento_caja_idx on public.pedidos_envio (id_movimiento_caja);

alter table public.pedidos_envio enable row level security;

