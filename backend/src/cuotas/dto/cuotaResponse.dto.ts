export class CuotaResponseDTO
{
    id!: number
    id_pedido!: number;
    numero!: number | null;
    fecha_vencimiento!: string | null;
    importe!: number | null;
    estado!: string | null;
    fecha_pago!: string | null;
}