// Agregado individual de una línea del pedido, con el precio que se cobró (total por prenda, se reparte en las cuotas)
export class AgregadoProductoPedidoDTO
{
    id_agregado!: number;
    agregado!: string;
    precio!: number;
}
