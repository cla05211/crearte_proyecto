import { ColegioDTO } from "../../gestionPedidos/dto/Colegio.dto";

export interface grupoClientePageResponseDTO
{
    idGrupo: number;
    orientacion: string;
    turno: string;
    nroFabrica: number|null;
    colegio:ColegioDTO
    nivel: string;
    padreResponsableNombre: string;
    padreResponsableApellido: string;
    contacto: string;
    fechaVenta: string;
}