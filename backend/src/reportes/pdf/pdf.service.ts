import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { GenerarReciboDTO } from './dto/generarRecibo.dto';
import { numeroALetras } from 'src/reportes/excel/nroALetras.util';
import * as fs from 'fs'
 
// Datos fijos de la empresa, tal como figuran en el membrete del recibo.
const EMPRESA = {
    nombre: 'CREARTE',
    lema: 'Buzos de egresados',
    responsable: 'de Adrián Alejandro Coassini',
    direccion: 'Alvear 123 Of. 8',
    localidad: 'B1832BVC - Lomas de Zamora, Provincia de Buenos Aires',
    telefono: 'Tel. 4243-4205',
    cuit: 'C.U.I.T.: 23-18380631-9',
    ingresosBrutos: 'INGR. BRUTOS CM: 902-2318380631-9',
    inicioActividades: 'Fecha de Inicio de Actividades: 11/2002',
    condicionIva: 'I.V.A. RESPONSABLE INSCRIPTO',
};
 
const LEYENDA_SENIA =
    'SEÑA: SE DEJA EXPRESA CONSTANCIA DE QUE, ANTE EL INGRESO DE LA SEÑA, LA EMPRESA YA COMIENZA A GENERAR COSTOS Y GASTOS, ES POR ELLO QUE, ' +
    'ANTE EL ARREPENTIMIENTO TRANSCURRIDOS LOS 15 DIAS, SE LE RECONOCERÁ Y DEVOLVERÁ EL 50% DE LO ABONADO OPORTUNAMENTE EN CONCEPTO ' +
    'DE SEÑA, Y TRANSCURRIDOS LOS 30 DIAS, NO SE HARA EFECTIVA NINGUNA DEVOLUCION. - (Art.1059 c.c. "La entrega de señal o arras se interpreta como ' +
    'confirmatoria del acto, excepto que las partes convengan la facultad de arrepentirse; en tal caso, quien entregó la señal la pierde en beneficio de la otra, y quien la ' +
    'recibió, debe restituirla doblada…").-'

const logoPath = path.join(__dirname, '..', 'assets', 'logo-crearte.png');
 
@Injectable()
export class PdfService
{
    private readonly logger = new Logger(PdfService.name);
    private printer: any;
    private logoBase64: string; 
 
    constructor()
    {
        this.logoBase64 = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'logo-crearte.png')).toString('base64');
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
        const rutaLogo = path.join(__dirname, '..', '..', 'assets', 'logo-crearte.png');
        this.logoBase64 = fs.readFileSync(rutaLogo).toString('base64');
    }
 
    async generarReciboPago(dto: GenerarReciboDTO): Promise<Buffer>
    {
        try
        {
            const montoFormateado = dto.importe.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const montoEnLetras = numeroALetras(dto.importe);
            const nombrePadre = dto.nombrePadre.charAt(0).toUpperCase() + dto.nombrePadre.slice(1).toLowerCase();
            const apellidoPadre = dto.apellidoPadre.charAt(0).toUpperCase() + dto.apellidoPadre.slice(1).toLowerCase();
            const MARGIN_X = 45;
            const CONTENT_WIDTH = 515;

            //Lineas de abajo
            const COL_LABEL_WIDTH = 405; // CONTENT_WIDTH (515) - COL_VALUE_WIDTH (80)
            const COL_VALUE_WIDTH = 90;
 
            const docDefinition: TDocumentDefinitions = {
                pageSize: 'A4',
                pageMargins: [45, 40, 40, 10], // dejamos más aire abajo para el bloque fijo
                defaultStyle: { font: 'Roboto', fontSize: 9 },
                images: { logoCrearte: `data:image/png;base64,${this.logoBase64}` },
                content: [
                    // Recuadro general que enmarca toda la hoja
                    {
                        canvas: [
                        {
                            type: 'rect',
                            x: 0,
                            y: 0,
                            w: 525,
                            h: 755,
                            lineWidth: 1,
                            lineColor: '#000000',
                        },],
                        absolutePosition: { x: 40, y: 30 },
                    },
                    // Encabezado: datos de la empresa + N° de recibo
                    {
                        columns: [
                            {
                                width: '60%',
                                stack: [
                                    { image: 'logoCrearte', width: 120, margin: [0, 0, 0, 6] },
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
                                        table: { widths: ['*'], body: [[{ text: 'RECIBO', alignment: 'right', bold: true, fontSize: 12 }]] },
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
                            { text: [{ text: 'Colegio: ', bold: true }, dto.clienteNombre] },
                            { text: [{ text: 'Localidad: ', bold: true }, dto.localidad ?? ''], margin: [0, 3, 0, 0] },
                            { text: [{ text: 'Turno: ', bold: true }, dto.turno?? ''], margin: [0, 3, 0, 0] },
                            (dto.orientacion !== '-' 
                                ? [{  
                                    text: [{ text: 'Modalidad: ', bold: true }, dto.orientacion ?? ''],
                                    margin: [0, 3, 0, 0]}]
                                : []
                            ),
                            { text: [{ text: 'Nivel: ', bold: true }, dto.nivel ?? ''], margin: [0, 3, 0, 0] },
                            { text: [{ text: 'Padre Responsable: ', bold: true }, `${nombrePadre} ${apellidoPadre}`], margin: [0, 3, 0, 0] },
                        ],
                    },
 
                    // Detalle
                    {
                        table: { widths: ['*'], body: [[{ text: 'DETALLE', alignment: 'center', bold: true, fontSize: 8 }]] },
                        layout: { fillColor: () => '#F2F2F2' },
                    },
                    {
                        margin: [0, 10, 0, 40],
                        text: `Recibimos de ${dto.clienteNombre.toUpperCase()} la suma de ${montoEnLetras} ($ ${montoFormateado}) en concepto de la ${dto.concepto.toLowerCase()}, correspondiente al plan de pagos de ${dto.nroCuotas} cuotas.`,
                    },
                    //Importe y eso
                    {
                        absolutePosition: { x: MARGIN_X, y: 660 },
                            table: {
                                widths: [COL_LABEL_WIDTH, COL_VALUE_WIDTH],
                                body: [
                                    [
                                        { text: 'Importe $', alignment: 'right', border: [false, true, false, false] },
                                        { text: montoFormateado, alignment: 'right', border: [false, true, false, false] },
                                    ],
                                    [
                                        { text: 'I.V.A. Inscr. %', alignment: 'right', border: [false, false, false, false] },
                                        { text: '', alignment: 'right', border: [false, false, false, false] },
                                    ],
                                ],
                            },
                                layout: {
                                    paddingTop: () => 3,
                                    paddingBottom: () => 6,
                                    paddingLeft: () => 4,
                                    paddingRight: () => 4,
                                },
                        },
                        //total
                        {
                            absolutePosition: { x: MARGIN_X, y: 700 }, // subí este número para bajarlo más
                            table: {
                                widths: [COL_LABEL_WIDTH, COL_VALUE_WIDTH],
                                body: [
                                    [
                                        { text: 'TOTAL $', alignment: 'right', bold: true, fontSize: 11, border: [false, true, false, false] },
                                        { text: montoFormateado, alignment: 'right', bold: true, fontSize: 11, border: [false, true, false, false] },
                                    ],
                                ],
                            },
                                layout: {
                                    paddingTop: () => 6,
                                    paddingBottom: () => 6,
                                    paddingLeft: () => 4,
                                    paddingRight: () => 4,
                                },
                        },

                    ...(dto.leyendaSenia === false? []:( [
                        {
                            absolutePosition: { x: MARGIN_X, y: 730 },
                            canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 1, lineColor: '#000000' }],
                        },
                        {
                            absolutePosition: { x: MARGIN_X, y: 740 },
                            text: LEYENDA_SENIA,
                            fontSize: 6,
                            width: COL_LABEL_WIDTH + COL_VALUE_WIDTH,
                        },]as Content[])),
                        {
                            absolutePosition: { x: MARGIN_X, y: 770 },
                            text: 'COMPROBANTE NO VÁLIDO COMO FACTURA',
                            fontSize: 7,
                            italics: true,
                        },
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