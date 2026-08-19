revoke delete on table "public"."pagos_documentos" from "anon";

revoke insert on table "public"."pagos_documentos" from "anon";

revoke references on table "public"."pagos_documentos" from "anon";

revoke select on table "public"."pagos_documentos" from "anon";

revoke trigger on table "public"."pagos_documentos" from "anon";

revoke truncate on table "public"."pagos_documentos" from "anon";

revoke update on table "public"."pagos_documentos" from "anon";

revoke delete on table "public"."pagos_documentos" from "authenticated";

revoke insert on table "public"."pagos_documentos" from "authenticated";

revoke references on table "public"."pagos_documentos" from "authenticated";

revoke select on table "public"."pagos_documentos" from "authenticated";

revoke trigger on table "public"."pagos_documentos" from "authenticated";

revoke truncate on table "public"."pagos_documentos" from "authenticated";

revoke update on table "public"."pagos_documentos" from "authenticated";

revoke delete on table "public"."pagos_documentos" from "service_role";

revoke insert on table "public"."pagos_documentos" from "service_role";

revoke references on table "public"."pagos_documentos" from "service_role";

revoke select on table "public"."pagos_documentos" from "service_role";

revoke trigger on table "public"."pagos_documentos" from "service_role";

revoke truncate on table "public"."pagos_documentos" from "service_role";

revoke update on table "public"."pagos_documentos" from "service_role";

alter table "public"."pagos_documentos" drop constraint "pagos_documentos_id_documento_fkey";

alter table "public"."pagos_documentos" drop constraint "pagos_documentos_id_pago_fkey";

alter table "public"."pagos_documentos" drop constraint "pagos_documentos_pkey";

drop index if exists "public"."pagos_documentos_pkey";

drop table "public"."pagos_documentos";

alter table "public"."pagos" add column "aprobado" boolean default true;

alter table "public"."pagos" add column "banco" text;

alter table "public"."pagos" add column "entidad_pago" text;

alter table "public"."pagos" add column "enviado_banco" boolean default false;

alter table "public"."pagos" add column "id_documento" bigint;

alter table "public"."pagos" add constraint "pagos_id_documento_fkey" FOREIGN KEY (id_documento) REFERENCES public.documentos(id) not valid;

alter table "public"."pagos" validate constraint "pagos_id_documento_fkey";


