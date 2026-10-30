-- Auditoría de cambios en pedidos: presupuesto/plan, beneficios, diseños (boceto y firmado) y talles.
-- Cada fila guarda quién hizo el cambio, cuándo, y una foto (JSON) de cómo estaba antes y cómo quedó.

-- Los talles editados los guarda el cliente desde el portal (no es un usuario interno),
-- así que el autor puede ser un usuario o un cliente, pero siempre uno de los dos.
alter table public.auditoria alter column usuario drop not null;

alter table public.auditoria
    add column if not exists id_pedido bigint,
    add column if not exists id_cliente bigint,
    add column if not exists despues_produccion boolean not null default false;

alter table public.auditoria
    add constraint auditoria_id_pedido_fkey foreign key (id_pedido) references public.pedidos(id) on delete cascade;

alter table public.auditoria
    add constraint auditoria_id_cliente_fkey foreign key (id_cliente) references public.clientes(id) on delete set null;

alter table public.auditoria
    add constraint auditoria_autor_check check (usuario is not null or id_cliente is not null);

create index if not exists auditoria_id_pedido_idx on public.auditoria (id_pedido);
create index if not exists auditoria_created_at_idx on public.auditoria (created_at desc);

-- Permiso de la página de auditoría (después hay que asignárselo al rol que corresponda en roles_permisos)
insert into public.permisos (nombre, descripcion)
select 'ver_auditoria', 'Ver la auditoría de cambios en pedidos (presupuesto, beneficios, diseño y talles)'
where not exists (select 1 from public.permisos where nombre = 'ver_auditoria');
