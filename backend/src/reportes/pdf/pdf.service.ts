import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { GenerarReciboDTO } from './dto/generarRecibo.dto';
import { numeroALetras } from 'src/reportes/excel/nroALetras.util';
 
// Datos fijos de la empresa, tal como figuran en el membrete del recibo.
const EMPRESA = {
    nombre: 'CREARTE',
    lema: 'Bolsos de egresados',
    responsable: 'de Adrián Alejandro Coassini',
    direccion: 'Alvear 123 Of. 8',
    localidad: 'B1832BVC - Lomas de Zamora, Provincia de Buenos Aires',
    telefono: 'Tel. 4243-4205',
    cuit: 'C.U.I.T.: 23-18380631-9',
    ingresosBrutos: 'INGR. BRUTOS CM: 902-2318380631-9',
    inicioActividades: 'Fecha de Inicio de Actividades: 11/2002',
    condicionIva: 'I.V.A. RESPONSABLE INSC RIPTO',
};
 
const LEYENDA_SENIA =
    'SEÑA: SE DEJA EXPRESA CONSTANCIA QUE, ANTE EL INGRESO DE LA SEÑA, LA EMPRESA YA COMIENZA A GENERAR COSTOS Y GASTOS, ES POR ELLO QUE, ' +
    'ANTE EL ARREPENTIMIENTO TRANSCURRIDOS LOS 15 DIAS, SE LE RECONOCERA Y DEVOLVERA EL 50% DE LO ABONADO OPORTUNAMENTE EN CONCEPTO ' +
    'DE SEÑA, Y TRANSCURRIDOS LOS 30 DIAS, NO SE HARA EFECTIVA NINGUNA DEVOLUCION. - (Art.1059 c.c. "La entrega de señal o arras se interpreta como ' +
    'confirmatoria del acto, excepto que las partes convengan la facultad de arrepentirse; en tal caso, quien entregó la señal la pierde en beneficio de la otra, y quien la ' +
    'recibió, debe restituirla doblada…").-';
 
@Injectable()
export class PdfService
{
    private readonly logger = new Logger(PdfService.name);
    private printer: any;
 
    constructor()
    {
        const PdfPrinter = require('pdfmake');
        const carpetaFuentes = path.join(path.dirname(require.resolve('pdfmake/package.json')), 'build', 'fonts', 'Roboto');
 
        PdfPrinter.fonts = {
            Roboto: {
                normal: path.join(carpetaFuentes, 'Roboto-Regular.ttf'),
                bold: path.join(carpetaFuentes, 'Roboto-Medium.ttf'),
                italics: path.join(carpetaFuentes, 'Roboto-Italic.ttf'),
                bolditalics: path.join(carpetaFuentes, 'Roboto-MediumItalic.ttf'),
            },
        };
        PdfPrinter.setLocalAccessPolicy((rutaArchivo: string) => rutaArchivo.startsWith(carpetaFuentes));
 
        this.printer = PdfPrinter;
    }
 
    async generarReciboPago(dto: GenerarReciboDTO): Promise<Buffer>
    {
        try
        {
            const montoFormateado = dto.importe.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const montoEnLetras = numeroALetras(dto.importe);
 
            const docDefinition: TDocumentDefinitions = {
                pageSize: 'A4',
                pageMargins: [40, 40, 40, 60],
                defaultStyle: { font: 'Roboto', fontSize: 9 },
                content: [
                    // Encabezado: datos de la empresa + N° de recibo
                    {
                        columns: [
                            {
                                width: '60%',
                                stack: [
                                    { text: EMPRESA.nombre, fontSize: 20, bold: true, color: '#E91E63' },
                                    { text: EMPRESA.lema, fontSize: 9, italics: true, margin: [0, -2, 0, 4] },
                                    { text: EMPRESA.responsable, fontSize: 8 },
                                    { text: EMPRESA.direccion, fontSize: 8 },
                                    { text: EMPRESA.localidad, fontSize: 8 },
                                    { text: EMPRESA.telefono, fontSize: 8 },
                                    { text: EMPRESA.condicionIva, fontSize: 8, bold: true, margin: [0, 4, 0, 0] },
                                ],
                            },
                            {
                                width: '40%',
                                stack: [
                                    {
                                        table: { widths: ['*'], body: [[{ text: 'RECIBO', alignment: 'center', bold: true, fontSize: 12 }]] },
                                        layout: 'noBorders',
                                    },
                                    { text: `N° ${dto.numero}`, alignment: 'right', bold: true, fontSize: 11, margin: [0, 4, 0, 2] },
                                    { text: `FECHA ${dto.fecha}`, alignment: 'right', fontSize: 9 },
                                    { text: EMPRESA.cuit, alignment: 'right', fontSize: 7, margin: [0, 8, 0, 0] },
                                    { text: EMPRESA.ingresosBrutos, alignment: 'right', fontSize: 7 },
                                    { text: EMPRESA.inicioActividades, alignment: 'right', fontSize: 7 },
                                ],
                            },
                        ],
                    },
                    { canvas: [{ type: 'line' as const, x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#000000' }] },
 
                    // Datos del cliente
                    {
                        margin: [0, 15, 0, 15],
                        stack: [
                            { text: [{ text: 'Señor/es: ', bold: true }, dto.clienteNombre] },
                            { text: [{ text: 'Domicilio: ', bold: true }, dto.domicilio ?? ''], margin: [0, 3, 0, 0] },
                            { text: [{ text: 'Localidad: ', bold: true }, dto.localidad ?? ''], margin: [0, 3, 0, 0] },
                        ],
                    },
 
                    // Detalle
                    {
                        table: { widths: ['*'], body: [[{ text: 'DETALLE', alignment: 'center', bold: true, fontSize: 8 }]] },
                        layout: { fillColor: () => '#F2F2F2' },
                    },
                    {
                        margin: [0, 10, 0, 40],
                        text: `Recibimos de ${dto.clienteNombre.toUpperCase()} la suma de ${montoEnLetras} ($ ${montoFormateado}) en concepto de: ${dto.concepto}`,
                    },
 
                    // Totales
                    {
                        margin: [0, 0, 0, 0],
                        table: {
                            widths: ['*', 80],
                            body: [
                                [{ text: 'Importe $', alignment: 'right', border: [false, true, false, false] }, { text: montoFormateado, alignment: 'right', border: [false, true, false, false] }],
                                [{ text: 'I.V.A. Inscr. %', alignment: 'right', border: [false, false, false, false] }, { text: '', alignment: 'right', border: [false, false, false, false] }],
                                [{ text: 'TOTAL $', alignment: 'right', bold: true, fontSize: 11, border: [false, true, false, false] }, { text: montoFormateado, alignment: 'right', bold: true, fontSize: 11, border: [false, true, false, false] }],
                            ],
                        },
                    },
 
                    ...(dto.leyendaSenia === false
                        ? []
                        : [
                              { canvas: [{ type: 'line' as const, x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 0.5, lineColor: '#000000' }] },
                              { text: LEYENDA_SENIA, fontSize: 6, margin: [0, 8, 0, 4] as [number, number, number, number] },
                          ]),
 
                    { text: 'COMPROBANTE NO VÁLIDO COMO FACTURA', fontSize: 7, italics: true },
                ],
            };
 
            const pdfDoc = this.printer.createPdf(docDefinition);
            return await pdfDoc.getBuffer();
        }
        catch (error)
        {
            this.logger.error('Error al generar el PDF del recibo', error);
            throw error;
        }
    }
}