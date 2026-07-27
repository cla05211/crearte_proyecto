


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."crear_pedido_completo"("payload" "jsonb") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  id_colegio      bigint;
  id_grupo        bigint;
  id_pedido       bigint;
  id_pago         bigint;
  id_documento    bigint;
  producto        jsonb;
  padre           jsonb;
  alumno          jsonb;
  documento       jsonb;
  nro_cuotas      int;
  fecha_primera   date;
  importe_cuota   double precision;
  numero_primera  int;
  dia_original    int;
  fecha_mes_base  date;
  ultimo_dia_mes  int;
  fecha_calculada date;
  i               int;
begin
  -- Colegio (con deduplicación por nombre + localidad, igual que crearColegio())
  select id into id_colegio
  from colegios
  where nombre = payload->'colegioDTO'->>'nombre'
    and localidad = payload->'colegioDTO'->>'localidad'
  limit 1;
 
  if id_colegio is null then
    insert into colegios (nombre, localidad, provincia)
    values (
      payload->'colegioDTO'->>'nombre',
      payload->'colegioDTO'->>'localidad',
      payload->'colegioDTO'->>'provincia'
    )
    returning id into id_colegio;
  end if;
 
  -- Grupo
  insert into grupos (id_colegio, orientacion, turno, nivel, promo, cantidad_egresados)
  values (
    id_colegio,
    payload->'grupoDTO'->>'orientacion',
    payload->'grupoDTO'->>'turno',
    payload->'grupoDTO'->>'nivel',
    (payload->'grupoDTO'->>'promo')::bigint,
    (payload->'grupoDTO'->>'cantidad_egresados')::bigint
  )
  returning id into id_grupo;
 
  -- Pedido
  insert into pedidos (
    id_grupo, talles, envio_gratis, seña, observaciones, estado_general,
    fecha_aprobacion_boceto, fecha_aprobacion_talles, colores,
    cantidad_hermanos, porcentaje_descuento_hermanos, id_vendedora,
    buzo_campera, chomba_remera, estado_boceto, estado_talles, id_diseñadora,
    recursos_adicionales
  )
  values (
    id_grupo,
    payload->'pedidoDTO'->>'talles',
    (payload->'pedidoDTO'->>'envio_gratis')::boolean,
    payload->'pedidoDTO'->>'seña',
    payload->'pedidoDTO'->>'observaciones',
    payload->'pedidoDTO'->>'estado_general',
    (payload->'pedidoDTO'->>'fecha_aprobacion_boceto')::date,
    (payload->'pedidoDTO'->>'fecha_aprobacion_talles')::date,
    payload->'pedidoDTO'->>'colores',
    coalesce((payload->'pedidoDTO'->>'cantidad_hermanos')::smallint, 0),
    (payload->'pedidoDTO'->>'porcentaje_descuento_hermanos')::smallint,
    (payload->'pedidoDTO'->>'id_vendedora')::bigint,
    payload->'pedidoDTO'->>'buzo_campera',
    payload->'pedidoDTO'->>'chomba_remera',
    payload->'pedidoDTO'->>'estado_boceto',
    payload->'pedidoDTO'->>'estado_talles',
    (payload->'pedidoDTO'->>'id_diseñadora')::bigint,
    array(select jsonb_array_elements_text(coalesce(payload->'pedidoDTO'->'recursos_adicionales', '[]'::jsonb)))
  )
  returning id into id_pedido;
 
  -- Productos del pedido
  for producto in select * from jsonb_array_elements(payload->'productosPedidoDTO')
  loop
    insert into productos_pedidos (
      id_pedido, id_producto_original, cantidad, descripcion, valor_seña, valor_cuota, beneficio
    )
    values (
      id_pedido,
      (producto->>'id_producto_original')::bigint,
      (producto->>'cantidad')::int,
      producto->>'descripcion',
      (producto->>'valor_seña')::real,
      (producto->>'valor_cuota')::real,
      producto->>'beneficio'
    );
  end loop;
 
  -- Padres responsables
  for padre in select * from jsonb_array_elements(payload->'padresResponsablesDTO')
  loop
    insert into padres_responsables (nombre, apellido, dni, telefono, mail, id_grupo)
    values (
      padre->>'nombre',
      padre->>'apellido',
      padre->>'dni',
      padre->>'telefono',
      padre->>'mail',
      id_grupo
    );
  end loop;
 
  -- Alumnos responsables
  for alumno in select * from jsonb_array_elements(payload->'alumnosResponsablesDTO')
  loop
    insert into alumnos_responsables (id_grupo, nombre, apellido, telefono)
    values (
      id_grupo,
      alumno->>'nombre',
      alumno->>'apellido',
      alumno->>'telefono'
    );
  end loop;
 
  -- Pago
  -- NOTA: PagoDTO no incluye 'fecha' actualmente; si no se manda, queda null.
  insert into pagos (id_pedido, nro_transferencia, tipo_pago, monto, motivo, fecha)
  values (
    id_pedido,
    payload->'pagoDTO'->>'nro_transferencia',
    payload->'pagoDTO'->>'tipo_pago',
    (payload->'pagoDTO'->>'monto')::double precision,
    payload->'pagoDTO'->>'motivo',
    (payload->'pagoDTO'->>'fecha')::date
  )
  returning id into id_pago;
 
  -- Documentos (uno o varios) + vínculo con el pago
  if jsonb_typeof(payload->'documentoDTO') = 'array' then
    for documento in select * from jsonb_array_elements(payload->'documentoDTO')
    loop
      insert into documentos (id_grupo, tipo, archivo_url)
      values (id_grupo, documento->>'tipo', documento->>'archivo_url')
      returning id into id_documento;
 
      insert into pagos_documentos (id_pago, id_documento)
      values (id_pago, id_documento);
    end loop;
  else
    insert into documentos (id_grupo, tipo, archivo_url)
    values (
      id_grupo,
      payload->'documentoDTO'->>'tipo',
      payload->'documentoDTO'->>'archivo_url'
    )
    returning id into id_documento;
 
    insert into pagos_documentos (id_pago, id_documento)
    values (id_pago, id_documento);
  end if;
 
  -- Movimiento en cuenta corriente
  insert into movimientos (id_grupo, importe, fecha)
  values (
    id_grupo,
    (payload->'movimientoDTO'->>'importe')::double precision,
    (payload->'movimientoDTO'->>'fecha')::timestamp
  );
 
  -- Cuotas: primera viene en 'primerCuota', el resto se calculan
  -- replicando CuotasService.acomodarFecha() (mismo día del mes,
  -- clampeado al último día si el mes no lo tiene).
  nro_cuotas     := (payload->>'nroCuotas')::int;
  fecha_primera  := (payload->'primerCuota'->>'fecha_vencimiento')::date;
  importe_cuota  := (payload->'primerCuota'->>'importe')::double precision;
  numero_primera := coalesce((payload->'primerCuota'->>'numero')::int, 1);
  dia_original   := extract(day from fecha_primera);
 
  insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado)
  values (id_pedido, numero_primera, fecha_primera, importe_cuota, 'Pendiente');
 
  for i in 1..(nro_cuotas - 1) loop
    fecha_mes_base := (date_trunc('month', fecha_primera) + (i || ' months')::interval)::date;
    ultimo_dia_mes := extract(day from (fecha_mes_base + interval '1 month - 1 day'));
    fecha_calculada := fecha_mes_base + (least(dia_original, ultimo_dia_mes) - 1);
 
    insert into cuotas (id_pedido, numero, fecha_vencimiento, importe, estado)
    values (id_pedido, numero_primera + i, fecha_calculada, importe_cuota, 'Pendiente');
  end loop;
 
  return id_pedido;
end;
$$;


ALTER FUNCTION "public"."crear_pedido_completo"("payload" "jsonb") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."agregados" (
    "id" bigint NOT NULL,
    "agregado" "text",
    "precio" real,
    "individual" boolean DEFAULT true
);


ALTER TABLE "public"."agregados" OWNER TO "postgres";


ALTER TABLE "public"."agregados" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."agregados_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."alumnos_responsables" (
    "id" bigint NOT NULL,
    "id_grupo" bigint,
    "nombre" "text",
    "apellido" "text",
    "telefono" "text"
);


ALTER TABLE "public"."alumnos_responsables" OWNER TO "postgres";


ALTER TABLE "public"."alumnos_responsables" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."alumnos_responsables_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."colegios" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "localidad" "text" NOT NULL,
    "provincia" "text" NOT NULL
);


ALTER TABLE "public"."colegios" OWNER TO "postgres";


ALTER TABLE "public"."colegios" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."colegios_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."productos" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text" NOT NULL
);


ALTER TABLE "public"."productos" OWNER TO "postgres";


ALTER TABLE "public"."productos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."combos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."contratos" (
    "id" bigint NOT NULL,
    "grupo" bigint,
    "documento" bigint,
    "firmado" boolean,
    "fecha_generación" "date",
    "fecha_firma" "date"
);


ALTER TABLE "public"."contratos" OWNER TO "postgres";


ALTER TABLE "public"."contratos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."contratos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."cuotas" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "numero" integer,
    "fecha_vencimiento" "date",
    "importe" double precision,
    "estado" "text" DEFAULT '"Pendiente"'::"text",
    "fecha_pago" "date"
);


ALTER TABLE "public"."cuotas" OWNER TO "postgres";


ALTER TABLE "public"."cuotas" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cuotas_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."documentos" (
    "id" bigint NOT NULL,
    "id_grupo" bigint NOT NULL,
    "tipo" "text",
    "archivo_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."documentos" OWNER TO "postgres";


ALTER TABLE "public"."documentos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."documentos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."grupos" (
    "id" bigint NOT NULL,
    "id_colegio" bigint NOT NULL,
    "orientacion" "text",
    "turno" "text",
    "nivel" "text",
    "promo" bigint,
    "cantidad_egresados" bigint,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."grupos" OWNER TO "postgres";


ALTER TABLE "public"."grupos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."grupos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."movimientos" (
    "id" bigint NOT NULL,
    "id_grupo" bigint NOT NULL,
    "importe" double precision,
    "fecha" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."movimientos" OWNER TO "postgres";


ALTER TABLE "public"."movimientos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."movimientos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."padres_responsables" (
    "id" bigint NOT NULL,
    "nombre" "text",
    "apellido" "text",
    "dni" "text",
    "telefono" "text",
    "mail" "text",
    "id_grupo" bigint
);


ALTER TABLE "public"."padres_responsables" OWNER TO "postgres";


ALTER TABLE "public"."padres_responsables" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."padres_responsables_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pagos" (
    "id" bigint NOT NULL,
    "id_pedido" bigint,
    "nro_transferencia" "text",
    "tipo_pago" "text",
    "monto" double precision,
    "motivo" "text",
    "fecha" "date"
);


ALTER TABLE "public"."pagos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pagos_documentos" (
    "id" bigint NOT NULL,
    "id_pago" bigint,
    "id_documento" bigint
);


ALTER TABLE "public"."pagos_documentos" OWNER TO "postgres";


ALTER TABLE "public"."pagos_documentos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pagos_documentos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."pagos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pagos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pedidos" (
    "id" bigint NOT NULL,
    "id_grupo" bigint NOT NULL,
    "talles" "text",
    "envio_gratis" boolean,
    "seña" "text",
    "observaciones" "text",
    "estado_general" "text" DEFAULT 'Venta realizada'::"text",
    "fecha_aprobacion_boceto" "date",
    "fecha_aprobacion_talles" "date",
    "colores" "text",
    "cantidad_hermanos" smallint DEFAULT '0'::smallint,
    "porcentaje_descuento_hermanos" smallint,
    "id_vendedora" bigint,
    "buzo_campera" "text",
    "chomba_remera" "text",
    "estado_boceto" "text",
    "estado_talles" "text",
    "id_diseñadora" bigint,
    "recursos_adicionales" "text"[]
);


ALTER TABLE "public"."pedidos" OWNER TO "postgres";


ALTER TABLE "public"."pedidos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."pedidos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."permisos" (
    "id" bigint NOT NULL,
    "nombre" "text",
    "descripcion" "text"
);


ALTER TABLE "public"."permisos" OWNER TO "postgres";


ALTER TABLE "public"."permisos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."permisos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."precios_productos" (
    "id" bigint NOT NULL,
    "id_producto" bigint NOT NULL,
    "cantidad_desde" integer NOT NULL,
    "cantidad_hasta" integer NOT NULL,
    "cuotas" integer NOT NULL,
    "seña" real NOT NULL,
    "valor_cuota" real NOT NULL,
    "beneficio" "text"
);


ALTER TABLE "public"."precios_productos" OWNER TO "postgres";


ALTER TABLE "public"."precios_productos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."precios_productos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."prendas_pedido" (
    "id" bigint NOT NULL,
    "pedido" bigint NOT NULL,
    "talle" "text",
    "producto" bigint,
    "inscripcion" "text"
);


ALTER TABLE "public"."prendas_pedido" OWNER TO "postgres";


ALTER TABLE "public"."prendas_pedido" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."prendas_pedido_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."productos_pedidos" (
    "id" bigint NOT NULL,
    "id_pedido" bigint NOT NULL,
    "id_producto" bigint NOT NULL,
    "cantidad" integer NOT NULL,
    "descripcion" "text",
    "valor_seña" real NOT NULL,
    "valor_cuota" real NOT NULL,
    "beneficio" "text"
);


ALTER TABLE "public"."productos_pedidos" OWNER TO "postgres";


ALTER TABLE "public"."productos_pedidos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."productos_pedidos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" bigint NOT NULL,
    "rol" bigint NOT NULL,
    "nombre_rol" "text" NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


ALTER TABLE "public"."roles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."roles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."roles_permisos" (
    "id" bigint NOT NULL,
    "rol_nro" bigint,
    "permiso_id" bigint
);


ALTER TABLE "public"."roles_permisos" OWNER TO "postgres";


ALTER TABLE "public"."roles_permisos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."roles_permisos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."usuarios" (
    "id" bigint NOT NULL,
    "id_auth" "uuid" NOT NULL,
    "nombre" "text",
    "apellido" "text",
    "rol" bigint,
    "aprobado" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."usuarios" OWNER TO "postgres";


ALTER TABLE "public"."usuarios" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."usuarios_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."agregados"
    ADD CONSTRAINT "agregados_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alumnos_responsables"
    ADD CONSTRAINT "alumnos_responsables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colegios"
    ADD CONSTRAINT "colegios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos"
    ADD CONSTRAINT "combos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cuotas"
    ADD CONSTRAINT "cuotas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documentos"
    ADD CONSTRAINT "documentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grupos"
    ADD CONSTRAINT "grupos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."grupos"
    ADD CONSTRAINT "grupos_unicos" UNIQUE ("id_colegio", "nivel", "turno", "orientacion", "promo");



ALTER TABLE ONLY "public"."movimientos"
    ADD CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."padres_responsables"
    ADD CONSTRAINT "padres_responsables_dni_key" UNIQUE ("dni");



ALTER TABLE ONLY "public"."padres_responsables"
    ADD CONSTRAINT "padres_responsables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagos_documentos"
    ADD CONSTRAINT "pagos_documentos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permisos"
    ADD CONSTRAINT "permisos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."precios_productos"
    ADD CONSTRAINT "precios_productos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."prendas_pedido"
    ADD CONSTRAINT "prendas_pedido_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."productos_pedidos"
    ADD CONSTRAINT "productos_pedidos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles_permisos"
    ADD CONSTRAINT "roles_permisos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("nombre_rol");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_rol_key" UNIQUE ("rol");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."alumnos_responsables"
    ADD CONSTRAINT "alumnos_responsables_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_documento_fkey" FOREIGN KEY ("documento") REFERENCES "public"."documentos"("id");



ALTER TABLE ONLY "public"."contratos"
    ADD CONSTRAINT "contratos_grupo_fkey" FOREIGN KEY ("grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."cuotas"
    ADD CONSTRAINT "cuotas_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."documentos"
    ADD CONSTRAINT "documentos_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."grupos"
    ADD CONSTRAINT "grupos_colegio_fkey" FOREIGN KEY ("id_colegio") REFERENCES "public"."colegios"("id");



ALTER TABLE ONLY "public"."movimientos"
    ADD CONSTRAINT "movimientos_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."padres_responsables"
    ADD CONSTRAINT "padres_responsables_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."pagos_documentos"
    ADD CONSTRAINT "pagos_documentos_id_documento_fkey" FOREIGN KEY ("id_documento") REFERENCES "public"."documentos"("id");



ALTER TABLE ONLY "public"."pagos_documentos"
    ADD CONSTRAINT "pagos_documentos_id_pago_fkey" FOREIGN KEY ("id_pago") REFERENCES "public"."pagos"("id");



ALTER TABLE ONLY "public"."pagos"
    ADD CONSTRAINT "pagos_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."pedidos"
    ADD CONSTRAINT "pedidos_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "public"."grupos"("id");



ALTER TABLE ONLY "public"."precios_productos"
    ADD CONSTRAINT "precios_productos_id_producto_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."prendas_pedido"
    ADD CONSTRAINT "prendas_pedido_pedido_fkey" FOREIGN KEY ("pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."prendas_pedido"
    ADD CONSTRAINT "prendas_pedido_producto_fkey" FOREIGN KEY ("producto") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."productos_pedidos"
    ADD CONSTRAINT "productos_pedidos_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "public"."pedidos"("id");



ALTER TABLE ONLY "public"."productos_pedidos"
    ADD CONSTRAINT "productos_pedidos_id_producto_original_fkey" FOREIGN KEY ("id_producto") REFERENCES "public"."productos"("id");



ALTER TABLE ONLY "public"."roles_permisos"
    ADD CONSTRAINT "roles_permisos_permiso_id_fkey" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id");



ALTER TABLE ONLY "public"."roles_permisos"
    ADD CONSTRAINT "roles_permisos_rol_nro_fkey" FOREIGN KEY ("rol_nro") REFERENCES "public"."roles"("rol");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_id_auth_fkey" FOREIGN KEY ("id_auth") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."usuarios"
    ADD CONSTRAINT "usuarios_rol_fkey" FOREIGN KEY ("rol") REFERENCES "public"."roles"("rol");



CREATE POLICY "Usuarios pueden ver su propia fila" ON "public"."usuarios" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id_auth"));



ALTER TABLE "public"."agregados" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."alumnos_responsables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."colegios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contratos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cuotas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."grupos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."movimientos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."padres_responsables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pagos_documentos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pedidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permisos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."precios_productos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."prendas_pedido" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."productos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."productos_pedidos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles_permisos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."usuarios" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."crear_pedido_completo"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."crear_pedido_completo"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."crear_pedido_completo"("payload" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."agregados" TO "anon";
GRANT ALL ON TABLE "public"."agregados" TO "authenticated";
GRANT ALL ON TABLE "public"."agregados" TO "service_role";



GRANT ALL ON SEQUENCE "public"."agregados_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."agregados_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."agregados_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."alumnos_responsables" TO "anon";
GRANT ALL ON TABLE "public"."alumnos_responsables" TO "authenticated";
GRANT ALL ON TABLE "public"."alumnos_responsables" TO "service_role";



GRANT ALL ON SEQUENCE "public"."alumnos_responsables_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."alumnos_responsables_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."alumnos_responsables_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."colegios" TO "anon";
GRANT ALL ON TABLE "public"."colegios" TO "authenticated";
GRANT ALL ON TABLE "public"."colegios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."colegios_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."colegios_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."colegios_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."productos" TO "anon";
GRANT ALL ON TABLE "public"."productos" TO "authenticated";
GRANT ALL ON TABLE "public"."productos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."combos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."combos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."combos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contratos" TO "anon";
GRANT ALL ON TABLE "public"."contratos" TO "authenticated";
GRANT ALL ON TABLE "public"."contratos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."contratos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."contratos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."contratos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cuotas" TO "anon";
GRANT ALL ON TABLE "public"."cuotas" TO "authenticated";
GRANT ALL ON TABLE "public"."cuotas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cuotas_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cuotas_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cuotas_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."documentos" TO "anon";
GRANT ALL ON TABLE "public"."documentos" TO "authenticated";
GRANT ALL ON TABLE "public"."documentos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."documentos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."documentos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."documentos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."grupos" TO "anon";
GRANT ALL ON TABLE "public"."grupos" TO "authenticated";
GRANT ALL ON TABLE "public"."grupos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."grupos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."grupos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."grupos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."movimientos" TO "anon";
GRANT ALL ON TABLE "public"."movimientos" TO "authenticated";
GRANT ALL ON TABLE "public"."movimientos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."movimientos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."movimientos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."movimientos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."padres_responsables" TO "anon";
GRANT ALL ON TABLE "public"."padres_responsables" TO "authenticated";
GRANT ALL ON TABLE "public"."padres_responsables" TO "service_role";



GRANT ALL ON SEQUENCE "public"."padres_responsables_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."padres_responsables_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."padres_responsables_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pagos" TO "anon";
GRANT ALL ON TABLE "public"."pagos" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos" TO "service_role";



GRANT ALL ON TABLE "public"."pagos_documentos" TO "anon";
GRANT ALL ON TABLE "public"."pagos_documentos" TO "authenticated";
GRANT ALL ON TABLE "public"."pagos_documentos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pagos_documentos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pagos_documentos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pagos_documentos_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pagos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pagos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pagos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pedidos" TO "anon";
GRANT ALL ON TABLE "public"."pedidos" TO "authenticated";
GRANT ALL ON TABLE "public"."pedidos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."pedidos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."pedidos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."pedidos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."permisos" TO "anon";
GRANT ALL ON TABLE "public"."permisos" TO "authenticated";
GRANT ALL ON TABLE "public"."permisos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."permisos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."permisos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."permisos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."precios_productos" TO "anon";
GRANT ALL ON TABLE "public"."precios_productos" TO "authenticated";
GRANT ALL ON TABLE "public"."precios_productos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."precios_productos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."precios_productos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."precios_productos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."prendas_pedido" TO "anon";
GRANT ALL ON TABLE "public"."prendas_pedido" TO "authenticated";
GRANT ALL ON TABLE "public"."prendas_pedido" TO "service_role";



GRANT ALL ON SEQUENCE "public"."prendas_pedido_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."prendas_pedido_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."prendas_pedido_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."productos_pedidos" TO "anon";
GRANT ALL ON TABLE "public"."productos_pedidos" TO "authenticated";
GRANT ALL ON TABLE "public"."productos_pedidos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."productos_pedidos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."productos_pedidos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."productos_pedidos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."roles_permisos" TO "anon";
GRANT ALL ON TABLE "public"."roles_permisos" TO "authenticated";
GRANT ALL ON TABLE "public"."roles_permisos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."roles_permisos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_permisos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_permisos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios" TO "anon";
GRANT ALL ON TABLE "public"."usuarios" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."usuarios_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."usuarios_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."usuarios_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







