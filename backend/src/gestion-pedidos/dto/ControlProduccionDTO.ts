// 'No lleva' = el pedido no incluye esa categoría; si la incluye, el estado guardado en pedidos (Pendiente / Ok)
export type EstadoPrenda = 'Ok' | 'Pendiente' | 'No lleva';

export class ControlProduccionDTO
{
    idPedido!: number;
    fechaEntrega!: null | string;
    nroFabrica!: null | number;
    colegio!: string;
    localidad!: string;
    provincia!: string;
    camperas_buzos!: EstadoPrenda;
    chombas_remeras!: EstadoPrenda;
    bandera!: EstadoPrenda;
    pantalon!: EstadoPrenda;
    estado_pedido!: string;
    contratoFirmado!: boolean;
}
