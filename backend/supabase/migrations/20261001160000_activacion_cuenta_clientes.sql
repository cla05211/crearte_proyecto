-- Activación de cuenta de clientes por link (en lugar de mandar la contraseña por WhatsApp).
--
-- Al crear el pedido, el cliente se crea SIN contraseña (contrasena_hash = null).
-- Cuando se le manda el WhatsApp con el acceso a la plataforma, se genera un token
-- de un solo uso; el cliente entra a /crear-contrasena/<token> y elige su contraseña.
-- En la base se guarda solo el hash SHA-256 del token, nunca el token en sí.

alter table public.clientes
    alter column contrasena_hash drop not null;

alter table public.clientes
    add column token_activacion_hash   text unique,
    add column token_activacion_expira timestamptz;
