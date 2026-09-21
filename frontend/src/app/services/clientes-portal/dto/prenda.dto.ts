export interface PrendaPedidoDTO
{
    id_pedido: number;
    id_producto: number;
    talle: string;
    inscripcion: string;
    id_producto_pedido?:number;
}