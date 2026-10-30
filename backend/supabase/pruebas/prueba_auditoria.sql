-- Datos de ejemplo para ver la página de Auditoría.
-- Correr DESPUÉS de la migración 20261030120000_auditoria_cambios_pedidos.sql (en el SQL Editor de Supabase).
-- Talles y diseño solo se auditan con el pedido en producción, por eso esos ejemplos son todos posteriores.
-- Usa pedidos, usuarios y clientes que ya existen en la base. Las filas de prueba quedan marcadas con
-- registro_id_modificado = -1 para poder borrarlas con el bloque del final.
-- Ojo: los archivos de diseño son inventados, así que "Descargar versión..." va a dar error en estas filas.

do $$
declare
    v_usuario     bigint;
    v_usuario2    bigint;
    v_pedido_prod bigint;   -- pedido ya enviado a producción (o el más nuevo si no hay ninguno)
    v_pedido_2    bigint;   -- otro pedido cualquiera
    v_cliente     bigint;
    v_talles_antes text;
    v_talles_despues text;
begin
    select id into v_usuario  from public.usuarios order by id limit 1;
    select id into v_usuario2 from public.usuarios order by id offset 1 limit 1;
    v_usuario2 := coalesce(v_usuario2, v_usuario);

    select id into v_pedido_prod from public.pedidos where nro_fabrica is not null order by id desc limit 1;
    if v_pedido_prod is null then
        select id into v_pedido_prod from public.pedidos order by id desc limit 1;
    end if;

    select id into v_pedido_2 from public.pedidos where id <> v_pedido_prod order by id desc limit 1;
    v_pedido_2 := coalesce(v_pedido_2, v_pedido_prod);

    select c.id into v_cliente
    from public.clientes c join public.pedidos p on p.id_grupo = c.id_grupo
    where p.id = v_pedido_prod limit 1;

    if v_usuario is null or v_pedido_prod is null then
        raise exception 'Hace falta al menos un usuario y un pedido en la base';
    end if;

    v_talles_antes := '[
        {"producto":"Buzo","talle":"L","inscripcion":"Juan"},
        {"producto":"Buzo","talle":"L","inscripcion":"Lucía"},
        {"producto":"Buzo","talle":"M","inscripcion":"Martina"},
        {"producto":"Buzo","talle":"M","inscripcion":"Sofía"},
        {"producto":"Buzo","talle":"S","inscripcion":"Tomás"},
        {"producto":"Remera","talle":"M","inscripcion":"Juan"},
        {"producto":"Remera","talle":"S","inscripcion":"Martina"}
    ]';
    -- Sofía pasa de M a L, Tomás se va, entra Valentín
    v_talles_despues := '[
        {"producto":"Buzo","talle":"L","inscripcion":"Juan"},
        {"producto":"Buzo","talle":"L","inscripcion":"Lucía"},
        {"producto":"Buzo","talle":"L","inscripcion":"Sofía"},
        {"producto":"Buzo","talle":"M","inscripcion":"Martina"},
        {"producto":"Buzo","talle":"XL","inscripcion":"Valentín"},
        {"producto":"Remera","talle":"M","inscripcion":"Juan"},
        {"producto":"Remera","talle":"S","inscripcion":"Martina"}
    ]';

    insert into public.auditoria
        (created_at, tabla, accion, id_pedido, usuario, id_cliente, registro_id_modificado, dato_anterior, dato_nuevo, despues_produccion)
    values
    -- 2. Presupuesto modificado (antes de producción)
    (now() - interval '15 days', 'productos_pedidos', 'Plan modificado', v_pedido_2, v_usuario, null, -1,
        '{"productos":[{"nombre":"Combo buzo + remera","cantidad":30,"valorSenia":20000,"valorCuota":18000},{"nombre":"Campera","cantidad":12,"valorSenia":15000,"valorCuota":9000}],"agregados":["Bandera"],"nroCuotas":10,"senia":780000,"totalCuotas":5832000,"total":6612000}',
        '{"productos":[{"nombre":"Combo buzo + remera","cantidad":34,"valorSenia":20000,"valorCuota":17500},{"nombre":"Campera","cantidad":12,"valorSenia":15000,"valorCuota":9000}],"agregados":["Bandera"],"nroCuotas":10,"senia":860000,"totalCuotas":6327000,"total":7187000}',
        false),

    -- 3. Beneficios modificados (con el pedido en producción)
    (now() - interval '6 days', 'beneficios_pedido', 'Beneficios modificados', v_pedido_prod, v_usuario2, null, -1,
        '[{"beneficio":"Bandera gratis","cantidad":1},{"beneficio":"Campera liberada","cantidad":2}]',
        '[{"beneficio":"Campera liberada","cantidad":3},{"beneficio":"Envío gratis","cantidad":1}]',
        true),

    -- 4. Boceto reemplazado después de producción
    (now() - interval '4 days', 'documentos', 'Boceto reemplazado', v_pedido_prod, v_usuario2, null, -1,
        '{"tipo":"Disenio Prendas","archivo":{"bucket":"disenios","ruta":"0/ejemplo-anterior.pdf"}}',
        '{"tipo":"Disenio Prendas","archivo":{"bucket":"disenios","ruta":"0/ejemplo-nuevo.pdf"}}',
        true),

    -- 6. Se reabre la planilla de talles (en producción)
    (now() - interval '3 days', 'prendas_pedido', 'Edición de talles habilitada', v_pedido_prod, v_usuario, null, -1,
        v_talles_antes, null, true),

    -- 7. El cliente guarda los talles editados (en producción)
    (now() - interval '2 days', 'prendas_pedido', 'Talles editados por el cliente', v_pedido_prod,
        case when v_cliente is null then v_usuario end, v_cliente, -1, v_talles_antes, v_talles_despues, true),

    -- 8. Recálculo del presupuesto por esos talles (en producción)
    (now() - interval '2 days' + interval '1 second', 'productos_pedidos', 'Plan recalculado por talles', v_pedido_prod,
        case when v_cliente is null then v_usuario end, v_cliente, -1,
        '{"productos":[{"nombre":"Buzo","cantidad":5,"valorSenia":25000,"valorCuota":21000},{"nombre":"Remera","cantidad":2,"valorSenia":8000,"valorCuota":7000}],"agregados":[],"nroCuotas":8,"senia":141000,"totalCuotas":833000,"total":974000}',
        '{"productos":[{"nombre":"Buzo","cantidad":5,"valorSenia":25000,"valorCuota":21000},{"nombre":"Remera","cantidad":2,"valorSenia":8000,"valorCuota":7000}],"agregados":[],"nroCuotas":8,"senia":141000,"totalCuotas":845500,"total":986500}',
        true);
end $$;


-- Para borrar los datos de ejemplo:
-- delete from public.auditoria where registro_id_modificado = -1;
