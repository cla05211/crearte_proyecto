export class MuestrasFisicasResponseDTO
{
    id!: number;
    id_pedido!: number;
    estado!: string | null;
    muestras!: string | null;
    fecha_entrega!: string | null;
    fecha_devolucion!:string | null;
    envio!: boolean | null;
}