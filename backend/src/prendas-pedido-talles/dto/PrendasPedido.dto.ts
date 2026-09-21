export class PrendaPedidoDTO
{
    id_pedido!: number;
    id_producto!: number;
    talle!: string;
    inscripcion!: string | null;
    id_producto_pedido?:number;
}