export class NotificacionesDTO
{
    id_pedido!: number;
    plantilla!: string;
    estado!: 'pendiente'|'enviado'|'error'|'cancelado';
    sector!: 'Administración'|'Disenio'|'Talles'
    fecha_programada?: string;
    id_cuota?: number;
}
