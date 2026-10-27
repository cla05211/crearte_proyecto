export class PedirUrlSubidaExtraDTO
{
    idGrupo!: number;
    nombreArchivo!: string;
    // mimetype del archivo (image/jpeg, image/png, image/webp o application/pdf)
    tipoArchivo!: string;
}

export class ConfirmarExtraDTO
{
    idGrupo!: number;
    ruta!: string;
}

export class ExtraResponseDTO
{
    id!: number;
    nombre!: string;
    formato!: 'pdf' | 'imagen';
    created_at!: string | null;
}
