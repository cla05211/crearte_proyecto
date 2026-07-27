import { AgregadoDBDTO } from "../../../services/productos/dto/agregadoDB.dto";

export interface ProductoSeleccionado
{
    idProducto: number;

    cantidad: number;

    cuotas: number;

    valorSenia: number;

    valorCuota: number;

    beneficio: string;

    descripcion: string;

    agregados: AgregadoDBDTO[];

}