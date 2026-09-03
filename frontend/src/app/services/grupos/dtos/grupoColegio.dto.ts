import { ColegioDTO } from "../../gestionPedidos/dto/Colegio.dto";
import { GrupoDTO } from "../../gestionPedidos/dto/grupo.dto";

export class GrupoConColegioDTO extends GrupoDTO {
    colegio?: ColegioDTO;
}
