export interface DisenioResponseDTO
{
    id: number;
    tipo: string;
    created_at: string | null;
    // Si el cliente ya lo firmó (existe 'Firma ' + tipo en documentos). Firmado = no se puede reemplazar
    firmado: boolean;
}

export interface DiseniosGrupoResponseDTO
{
    disenios: DisenioResponseDTO[];
    tieneBandera: boolean;
    tallesConfirmados: boolean;
}
