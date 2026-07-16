export interface UsuarioSupabaseDTO
{
    nombre: string;
    apellido: string;
    aprobado: boolean;
    roles: {
        nombre_rol: string;
    };
}