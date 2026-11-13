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

// ---- Reparto de agregados según el tipo de plan ----
// Con seña: los agregados (individuales y bandera) se cobran solo en las cuotas.
// Sin seña (cuotas iguales): la seña es la cuota 1, así que se reparten entre la seña y las cuotas (cuotas + 1 pagos)
// para que todos los pagos queden iguales.
export function pagosDelPlan(cuotas: number, conSenia: boolean): number
{
  return conSenia ? cuotas : cuotas + 1;
}

// Seña y cuota por prenda: precio de lista + su parte de los agregados individuales (costo = total por prenda)
export function preciosConAgregados(
  precio: { valor_senia: number; valor_cuota: number },
  costoAgregados: number,
  cuotas: number,
  conSenia: boolean,
): { valorSenia: number; valorCuota: number }
{
  const pagos = pagosDelPlan(cuotas, conSenia);
  const parte = pagos ? costoAgregados / pagos : 0;
  return {
    valorSenia: Number(precio.valor_senia) + (conSenia ? 0 : parte),
    valorCuota: Number(precio.valor_cuota) + parte,
  };
}

// Parte de un agregado global (bandera, precio total del pedido) en cada cuota y en la seña
export function parteAgregadoGlobal(precio: number, cuotas: number, conSenia: boolean): { cuota: number; senia: number }
{
  const pagos = pagosDelPlan(cuotas, conSenia);
  const parte = pagos ? Number(precio) / pagos : 0;
  return { cuota: parte, senia: conSenia ? 0 : parte };
}

// ---- Cuotas reales para mostrar (presupuesto) ----
// En cuotas iguales la seña es la cuota 1, así que las cuotas guardadas se muestran corridas en uno.
export interface CuotaParaMostrar
{
  etiqueta: string;
  importe: number;
}

export function cuotasParaMostrar(cuotas: { numero: number | null; importe: number | null }[], conSenia: boolean): CuotaParaMostrar[]
{
  return [...cuotas]
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    .map((cuota) => ({
      etiqueta: `Cuota ${(cuota.numero ?? 0) + (conSenia ? 0 : 1)}`,
      importe: Number(cuota.importe ?? 0),
    }));
}

// true si todas las cuotas tienen el mismo importe (tolerancia de $1 por redondeo)
export function cuotasTodasIguales(cuotas: CuotaParaMostrar[]): boolean
{
  return cuotas.every((cuota) => Math.abs(cuota.importe - (cuotas[0]?.importe ?? 0)) < 1);
}
