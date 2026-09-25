// Beneficio del catálogo (tabla beneficios). id_producto != null => prenda liberada de ese producto.
export interface BeneficioResponseDTO
{
    id: number;
    beneficio: string;
    id_producto: number | null;
}
