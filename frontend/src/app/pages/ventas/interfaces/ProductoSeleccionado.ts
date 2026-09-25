import { AgregadoDBDTO } from "../../../services/productos/dto/agregadoDB.dto";

export interface ProductoSeleccionado
{
    idProducto: number;

    cantidad: number;

    cuotas: number;

    valorSenia: number;

    valorCuota: number;

    descripcion: string;

    agregados: AgregadoDBDTO[];

}