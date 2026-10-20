export interface DisenioResponseDTO
{
    id: number;
    tipo: string;
    created_at: string | null;
    // Si ya se subió el boceto firmado (existe 'Firma ' + tipo en documentos). Firmado = el PDF no se puede reemplazar
    firmado: boolean;
}

export interface DiseniosGrupoResponseDTO
{
    disenios: DisenioResponseDTO[];
    tieneBandera: boolean;
    tallesConfirmados: boolean;
}
