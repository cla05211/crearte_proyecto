import { Session } from "@supabase/supabase-js";
import { Usuario } from "../../../../interfaces/usuario";
import { Permiso } from "../../../../interfaces/permiso"; 

export interface respuestaLogin {
    session: Session;
    usuario: Usuario;
    permisos: Permiso[];
}