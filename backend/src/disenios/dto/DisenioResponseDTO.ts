export class DisenioResponseDTO
{
    id!: number;
    tipo!: string;
    created_at!: string | null;
}

export class DiseniosGrupoResponseDTO
{
    disenios!: DisenioResponseDTO[];
    tieneBandera!: boolean;
    tallesConfirmados!: boolean;
}
