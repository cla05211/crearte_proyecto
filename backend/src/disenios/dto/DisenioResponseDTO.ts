export class DisenioResponseDTO
{
    id!: number;
    tipo!: string;
    created_at!: string | null;
    firmado!:boolean;
}

export class DiseniosGrupoResponseDTO
{
    disenios!: DisenioResponseDTO[];
    tieneBandera!: boolean;
    tallesConfirmados!: boolean;
    edicionTallesHabilitada!: boolean;
}
