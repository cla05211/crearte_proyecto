export type FormatoColumnaExcel = 'texto' | 'numero' | 'moneda' | 'fecha';
 
export class ColumnaExcelDTO 
{
    header!: string;
    key!: string;
    width?: number;
    formato?: FormatoColumnaExcel;
}
 