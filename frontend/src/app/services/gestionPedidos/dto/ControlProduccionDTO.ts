// 'No lleva' = el pedido no incluye esa categoría de prenda
export type EstadoPrenda = 'Ok' | 'Pendiente' | 'No lleva';

export interface ControlProduccionDTO
{
    idPedido: number;
    fechaEntrega: null | string;
    nroFabrica: null | number;
    colegio: string;
    localidad: string;
    provincia: string;
    camperas: EstadoPrenda;
    buzos: EstadoPrenda;
    chombas: EstadoPrenda;
    remeras: EstadoPrenda;
    bandera: EstadoPrenda;
    pantalon: EstadoPrenda;
    estado_pedido: string;
    contratoFirmado: boolean;
}
