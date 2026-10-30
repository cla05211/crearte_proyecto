import { ColegioDTO } from "src/colegios/dto/Colegio.dto";

export class grupoClientePageResponseDTO
{
    idGrupo!: number;
    orientacion!: string;
    turno!: string;
    colegio!: ColegioDTO;
    nroFabrica!: number|null;
    nivel!: string;
    padreResponsableNombre!: string;
    padreResponsableApellido!: string;
    contacto!: string;
    fechaVenta!: string;
    estadoPedido!: string | null;
}