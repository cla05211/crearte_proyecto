export class MovimientoCajaResponseDTO
{
    id!: string;
    fecha!: Date;
    monto!: number;
    categoria!: string;
    descripcion!: string;
    usuario!: number | null;
    tipo!:string;
    origen!:string;
    id_pedido!: number | null; 
}