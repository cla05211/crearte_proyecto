export class MovimientoCajaResponseDTO
{
    id!: number;
    fecha!: Date;
    monto!: number;
    categoria!: string;
    descripcion!: string;
    usuario!: number | null;
    tipo!:string;
    origen!:string;
    id_pedido!: number | null; 
}