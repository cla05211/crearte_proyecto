// Plan de pago disponible en el catálogo: cantidad de cuotas y si lleva seña aparte.
// conSenia = false: "cuotas + 1 cuotas iguales" (la seña es la cuota 1).
export class PlanDisponibleDTO
{
    cuotas!: number;
    conSenia!: boolean;
}
