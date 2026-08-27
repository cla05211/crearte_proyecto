export class insertarAuditoriaDTO
{
    usuario!: number;
    tabla!: string;
    dato_anterior!: string;
    dato_nuevo!:string
    accion!: "INSERT" | "UPDATE" | "DELETE";
    registro_id_modificado!: number;
}