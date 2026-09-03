import { ColegioDTO } from "src/colegios/dto/Colegio.dto";

export class grupoClientePageResponseDTO
{
    idGrupo!: number;
    colegio!: ColegioDTO;
    nivel!: string;
    padreResponsableNombre!: string;
    padreResponsableApellido!: string;
}