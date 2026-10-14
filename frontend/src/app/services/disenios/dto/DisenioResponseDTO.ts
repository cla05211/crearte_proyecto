export interface DisenioResponseDTO
{
    id: number;
    // 'Disenio Prendas', 'Disenio Bandera' o 'Disenio {nombre}'
    tipo: string;
    created_at: string | null;
}

export interface DiseniosGrupoResponseDTO
{
    disenios: DisenioResponseDTO[];
    // Si el pedido lleva bandera (comprada o beneficio): define si se muestra "Diseño Bandera"
    tieneBandera: boolean;
    // estado_talles === 'Confirmado': recién ahí se puede descargar el resumen
    tallesConfirmados: boolean;
}
