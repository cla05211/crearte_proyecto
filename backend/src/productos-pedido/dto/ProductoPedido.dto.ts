export class ProductoPedidoDTO
{
    id_pedido!: number;
    id_producto_original!: number;
    descripcion!: string | null;
    valor_senia!: number;
    valor_cuota!: number;
    cantidad!: number;
}