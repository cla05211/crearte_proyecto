export interface PadreResponsableResponseDTO
{
    id:number;
    id_grupo: number;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    firma: number|null;
    principal: boolean;
}