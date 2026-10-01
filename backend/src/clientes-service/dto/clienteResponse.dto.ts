export class ClienteResponseDTO
{
    id!:number;
    id_grupo!: number;
    usuario!:string;
    contrasena_hash!:string | null;
    created_at!:string;
}