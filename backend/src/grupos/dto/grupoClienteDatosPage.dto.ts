import { PadreResponsableDTO } from "src/padre-responsable/dto/padreResponsable.dto";
import { GrupoDTO } from "./grupo.dto";
import { alumnoResponsableDTO } from "src/alumno-responsable/dto/alumnoResponsable.dto";
import { GrupoConColegioDTO } from "./grupoColegio.dto";

export class grupoDatosClienteResponse
{
    grupo!: GrupoConColegioDTO;
    padresResponsables!:PadreResponsableDTO[] | null;
    alumnosResponsables!:alumnoResponsableDTO[] | null;
}