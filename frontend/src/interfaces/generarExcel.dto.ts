import { ColumnaExcelDTO } from './columnaExcel.dto';
 
export class GenerarExcelDTO 
{
    nombreHoja!: string;
    columnas!: ColumnaExcelDTO[];
    filas!: Record<string, any>[];
}
 