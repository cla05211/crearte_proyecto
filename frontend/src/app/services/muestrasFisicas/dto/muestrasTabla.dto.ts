
import { PlanCuotasDTO } from "../../cuotas/dto/PlanDeCuotas.dto";
import { MuestrasFisicasResponseDTO } from "./MuestrasFisicasResponse.dto";

export class MuestrasTablaDTO
{
    muestra!: MuestrasFisicasResponseDTO;
    colegio!:string;
    nivel!:string;
    vendedora!:string;
    planCuotas!:PlanCuotasDTO;
}