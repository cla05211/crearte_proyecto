import { alumnoResponsableDTO } from "../../gestionPedidos/dto/alumnoResponsable.dto";
import { GrupoDTO } from "../../gestionPedidos/dto/grupo.dto";
import { PadreResponsableDTO } from "../../gestionPedidos/dto/padreResponsable.dto";
import { GrupoConColegioDTO } from "./grupoColegio.dto";

export class grupoClienteDatosPageResponse
{
    grupo!: GrupoConColegioDTO;
    padresResponsables!:PadreResponsableDTO[] | null;
    alumnosResponsables!:alumnoResponsableDTO[] | null;
}