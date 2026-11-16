import { BeneficioTramoDTO } from './BeneficioTramo.dto';

export interface ProductoConPrecioResponseDTO
{
    id: number;               // id de la fila en precios_productos (lo usa modificar precios)
    id_producto: number; 
    cantidad_desde: number;
    cantidad_hasta: number;
    cuotas: number;
    con_senia: boolean;
    activo: boolean;
    valor_senia: number;
    valor_cuota: number;
    beneficios: BeneficioTramoDTO[];
    nombre: string;
    descripcion:string;
}
