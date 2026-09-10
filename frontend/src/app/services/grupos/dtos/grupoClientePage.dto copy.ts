import { ColegioDTO } from "../../gestionPedidos/dto/Colegio.dto";

export interface grupoClientePageResponseDTO
{
    idGrupo: number;
    nroFabrica: number|null;
    colegio:ColegioDTO
    nivel: string;
    padreResponsableNombre: string;
    padreResponsableApellido: string;
}