// IDs de productos por tipo de prenda. Un combo aparece en cada tipo que incluye
// (ej. "Campera y Chomba" está en IDS_CAMPERA y en IDS_CHOMBA).
// Los usan el resumen de talles y el control de producción.
export const IDS_CAMPERA = [63, 67,68,71];
export const IDS_BUZO = [64, 69,70];
export const IDS_REMERA = [66, 68,69];
export const IDS_CHOMBA = [65, 67,70];

// Productos con beneficios por tramo (campera, buzo, los 4 combos y campera universitaria). Si en el recálculo por talles ninguno
// mantiene el tramo de la venta, el pedido pierde sus beneficios y recibe los del tramo nuevo.
export const IDS_CON_BENEFICIOS_TRAMO = [63, 64, 67, 68, 69, 70, 71];

// El primer tramo de precios arranca en 1, pero sus beneficios recién valen desde esta cantidad.
// Por debajo, para los beneficios es un tramo aparte (sin beneficios).
export const CANTIDAD_MINIMA_BENEFICIOS = 20;
