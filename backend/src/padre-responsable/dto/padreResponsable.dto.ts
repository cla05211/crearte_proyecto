export class PadreResponsableDTO
{
    id_grupo!: number
    nombre!: string |null;
    apellido!: string | null;
    dni!: string | null;
    telefono!: string | null;
    firma!: number|null;
    principal?:boolean;
}