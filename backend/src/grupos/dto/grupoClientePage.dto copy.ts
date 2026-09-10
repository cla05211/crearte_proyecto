import { ColegioDTO } from "src/colegios/dto/Colegio.dto";

export class grupoClientePageResponseDTO
{
    idGrupo!: number;
    colegio!: ColegioDTO;
    nroFabrica!: number|null;
    nivel!: string;
    padreResponsableNombre!: string;
    padreResponsableApellido!: string;
}