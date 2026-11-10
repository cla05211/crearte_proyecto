import { PlanCuotasDTO } from "src/cuotas/dto/PlanDeCuotas.dto";
import { MuestrasFisicasResponseDTO } from "./MuestrasFisicasResponse.dto";

export class MuestrasTablaDTO
{
    muestra!: MuestrasFisicasResponseDTO;
    colegio!:string;
    nivel!:string;
    promo!:number | null;
    vendedora!:string;
    planCuotas!:PlanCuotasDTO;
}