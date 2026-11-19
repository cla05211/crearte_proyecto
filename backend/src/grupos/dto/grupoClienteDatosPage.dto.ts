import { PadreResponsableDTO } from "../../padre-responsable/dto/padreResponsable.dto";
import { GrupoDTO } from "./grupo.dto";
import { alumnoResponsableDTO } from "../../alumno-responsable/dto/alumnoResponsable.dto";
import { GrupoConColegioDTO } from "./grupoColegio.dto";

export class grupoDatosClienteResponse
{
    grupo!: GrupoConColegioDTO;
    padresResponsables!:PadreResponsableDTO[] | null;
    alumnosResponsables!:alumnoResponsableDTO[] | null;
    usuario!: string | null;
    fechaVenta!: string;
    vendedora!:string;
}