import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ColumnaExcelDTO } from './dto/columnaExcel.dto';
 
const FORMATOS_NUMERICOS: Record<string, string> = {
    numero: '#,##0.##',
    moneda: '"$" #,##0.00',
    fecha: 'dd/mm/yyyy',
};
 
@Injectable()
export class ExcelService
{

    async generarExcel(nombreHoja: string, columnas: ColumnaExcelDTO[], filas: Record<string, any>[]): Promise<Buffer>
    {
        if (!columnas || columnas.length === 0)
        {
            throw new BadRequestException('Se necesita al menos una columna para generar el Excel');
        }
 
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'CREARTE';
        workbook.created = new Date();
 
        const hoja = workbook.addWorksheet(nombreHoja || 'Hoja 1');
 
        hoja.columns = columnas.map(columna => ({
            header: columna.header,
            key: columna.key,
            width: columna.width ?? 20,
            style: columna.formato && FORMATOS_NUMERICOS[columna.formato]
                ? { numFmt: FORMATOS_NUMERICOS[columna.formato] }
                : undefined,
        }));
 
        const filaHeader = hoja.getRow(1);
        filaHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        filaHeader.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE91E63' },
        };
        filaHeader.alignment = { vertical: 'middle', horizontal: 'center' };
        filaHeader.height = 22;
 
        filas.forEach(fila => hoja.addRow(fila));
 
        hoja.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: columnas.length },
        };
 
        hoja.eachRow(fila => {
            fila.eachCell(celda => {
                celda.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                };
            });
        });
 
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}
 