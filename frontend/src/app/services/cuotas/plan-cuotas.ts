// Etiqueta del plan de pago a partir de lo guardado en el pedido (pedidos.con_senia + cantidad de cuotas).
// Sin seña, la seña es la cuota 1: se muestran cuotas + 1 iguales.
export function etiquetaPlan(nroCuotas: number, conSenia: boolean): string
{
  return conSenia ? `${nroCuotas} cuotas + Seña` : `${nroCuotas + 1} cuotas iguales`;
}
