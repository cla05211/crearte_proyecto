export class PagarCuotaDTO
{
    id_pedido!: number;
    numero!: number;
    importe!: number;
    nuevoEstado!: "Pagada" | "Parcial";
}