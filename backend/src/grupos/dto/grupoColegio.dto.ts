import { ColegioDTO } from "../../colegios/dto/Colegio.dto";
import { GrupoDTO } from "./grupo.dto";

export class GrupoConColegioDTO extends GrupoDTO {
    colegio?: ColegioDTO;
}