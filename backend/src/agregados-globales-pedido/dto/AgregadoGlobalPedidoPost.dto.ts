export class AgregadoGlobalPedidoPostDTO
{
    id_agregado!: number;
    // Precio cobrado; si no viene, se toma el del catálogo al guardar
    precio?: number;
}
