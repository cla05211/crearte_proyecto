// Etiqueta del plan de pago a partir de lo guardado en el pedido (pedidos.con_senia + cantidad de cuotas).
// Sin seña, la seña es la cuota 1: se muestran cuotas + 1 iguales.
export function etiquetaPlan(nroCuotas: number, conSenia: boolean): string
{
  return conSenia ? `${nroCuotas} cuotas + Seña` : `${nroCuotas + 1} cuotas iguales`;
}

// Un plan se identifica por la cantidad de cuotas Y si lleva seña aparte:
// puede haber dos planes con las mismas cuotas (uno con seña y otro sin).
export interface PlanCuotas
{
  cuotas: number;
  conSenia: boolean;
}

// Clave de texto para usar como value de un <select> o para comparar planes
export function clavePlan(plan: PlanCuotas): string
{
  return `${plan.cuotas}-${plan.conSenia}`;
}

export function planDesdeClave(clave: string | null | undefined): PlanCuotas | null
{
  const [cuotas, senia] = String(clave ?? '').split('-');
  if (!Number(cuotas) || (senia !== 'true' && senia !== 'false')) return null;
  return { cuotas: Number(cuotas), conSenia: senia === 'true' };
}

// Planes para editar un pedido: los activos del catálogo más el plan actual del pedido,
// aunque esté desactivado (si no, el select quedaría vacío).
export function planesConActual(disponibles: PlanCuotas[], actual: PlanCuotas | null): PlanCuotas[]
{
  if (!actual || disponibles.some(p => clavePlan(p) === clavePlan(actual))) return disponibles;
  return [...disponibles, actual];
}
