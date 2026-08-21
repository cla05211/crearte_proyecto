export interface UsuarioSupabaseDTO
{
    id:number;
    idAuth: string;
    nombre: string;
    apellido: string;
    aprobado: boolean;
    roles: {
        nombre_rol: string;
    };
}