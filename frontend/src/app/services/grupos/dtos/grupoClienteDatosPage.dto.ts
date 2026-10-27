import { alumnoResponsableDTO } from "../../gestionPedidos/dto/alumnoResponsable.dto";
import { GrupoDTO } from "../../gestionPedidos/dto/grupo.dto";
import { PadreResponsableResponseDTO } from "../../padreResponsable/dto/padreResponsableResponse.dto";
import { GrupoConColegioDTO } from "./grupoColegio.dto";

export class grupoClienteDatosPageResponse
{
    grupo!: GrupoConColegioDTO;
    padresResponsables!:PadreResponsableResponseDTO[] | null;
    alumnosResponsables!:alumnoResponsableDTO[] | null;
    usuario!: string | null;
    fechaVenta!: string;
}