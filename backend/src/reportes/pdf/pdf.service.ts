import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { GenerarReciboDTO } from './dto/generarRecibo.dto';
import { GenerarContratoDTO } from './dto/generarContrato.dto';
import { numeroALetras } from 'src/reportes/excel/nroALetras.util';
import * as fs from 'fs'

// Formatea un monto en pesos con el criterio local (2 decimales, separador es-AR).
const formatearMonto = (monto?: number) =>
    (monto ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// "1er", "2da", "3er"... tal como se usan históricamente en los contratos de Crearte.
const ORDINALES_CUOTA = ['1er', '2da', '3er', '4ta', '5ta', '6ta', '7ma', '8va', '9na', '10ma'];
const ordinalCuota = (n: number) => ORDINALES_CUOTA[n - 1] ?? `${n}°`;

// Une una lista de strings en formato "a, b y c".
const unirConY = (items: string[]) =>
{
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
};
 
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
    private firmaAdrianBase64: string;

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
        const rutaFirmaAdrian = path.join(__dirname, '..', '..', 'assets', 'firma-adrian.png');
        this.firmaAdrianBase64 = fs.readFileSync(rutaFirmaAdrian).toString('base64');
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

    async generarContratoVenta(dto: GenerarContratoDTO): Promise<Buffer>
    {
        try
        {
            const terminoSenia = dto.tieneSenia ? 'seña' : 'primera cuota';
            const terminoSeniaCorto = dto.tieneSenia ? 'seña' : 'cuota';
            const terminoSeniaConcepto = dto.tieneSenia ? 'Seña' : 'la primera cuota';

            // Encabezado: comprador(es) y colegio
            const compradoresTexto = dto.compradores.map(c => `${c.nombre} con DNI: ${c.dni}`).join(' ; ');
            let colegioTexto = dto.colegioNombre;
            if (dto.turno) colegioTexto += `, turno ${dto.turno}`;
            if (dto.orientacion) colegioTexto += `, modalidad ${dto.orientacion}`;

            // Cláusula PRIMERA: cantidades y entrega total (misma lista de productos)
            const listaProductosConUnidades = unirConY(dto.productos.map(p => `${p.cantidad} unidades de ${p.producto}`));
            const listaProductosSimple = unirConY(dto.productos.map(p => `${p.cantidad} ${p.producto}`));
            const hayBeneficios = !!dto.beneficios && dto.beneficios.length > 0;

            // Cláusula TERCERA: cuotas
            const nroCuotas = dto.cuotas.length;
            const primerParrafoValores = dto.tieneSenia
                ? `En concepto de adelanto y fijación de precio de $ ${formatearMonto(dto.montoSenia)}.- por egresado más, ${nroCuotas} mensuales que serán abonadas de la siguiente forma:`
                : `Dos cuotas iguales de $ ${formatearMonto(dto.cuotas[0]?.monto)} que serán abonadas de la siguiente forma:`;

            const detalleCuotas: Content[] = dto.cuotas.map((cuota, i) =>
            {
                const ordinal = ordinalCuota(i + 1);
                const esUltima = i === dto.cuotas.length - 1;
                const texto = esUltima
                    ? `${ordinal} cuota de $ ${formatearMonto(cuota.monto)}. La misma será contra entrega de las prendas/o 72hs antes de la entrega, según lo convenido.`
                    : `${ordinal} cuota de $ ${formatearMonto(cuota.monto)} vencimiento el ${cuota.vencimiento ?? '____'}.`;
                return { text: texto, margin: [0, 2, 0, 0] };
            });

            const textoPrimeraInstancia = dto.tieneSenia
                ? 'Se realizará luego de 30 días de haber abonado la seña. Deben hacerlo en un único pago entre todos. En esta instancia, se debe tener aprobada la ficha técnica del modelo, la confirmación de envío a producción y la planilla de talles. A partir de este momento, no podrán realizar cambios en la cantidad pedida ni diseños de los productos.'
                : 'Deben hacerlo en un único pago entre todos. Una vez abonada, se elaborará una ficha técnica del modelo elegido (boceto digital) y podrán ver cómo quedará dicho modelo, con las inscripciones, tipografías, técnicas de bordados y estampados elegidos, tal como se indicó en el Inciso segundo.';
            const textoUltimaInstancia = dto.tieneSenia
                ? 'Esta cuota deberá abonarse exclusivamente una vez que el área de entregas se haya comunicado con el cliente para informar que el pedido se encuentra finalizado y listo para su entrega, y para coordinar fecha, modalidad de pago y entrega.'
                : 'Debe realizarse al momento de retirar el pedido o 72hs antes de la entrega de este, según lo convenido anteriormente. El mismo será retirado por un adulto autorizado previamente en la oficina de Crearte o lo recibirá en el domicilio pactado por ambas partes.';

            const instanciasProduccion: Content[] = dto.cuotas.map((_, i) =>
            {
                const ordinal = ordinalCuota(i + 1);
                let texto: string;
                if (i === 0) texto = textoPrimeraInstancia;
                else if (i === dto.cuotas.length - 1) texto = textoUltimaInstancia;
                else texto = `Se realizará luego de 30 días de haber abonado la ${ordinalCuota(i)} cuota. En esta instancia se realizará la firma de este acuerdo de partes.`;
                return { text: [{ text: `${ordinal} cuota: `, bold: true }, texto], margin: [0, 6, 0, 0], alignment: 'justify' as const };
            });

            // Bloques de firma: uno por cada comprador (el primero junto al de Crearte)
            const bloqueFirma = (etiqueta: string, aclaracion?: string, dniFijo?: string, imagenKey?: string): any => ({
                width: '48%',
                stack: [
                    imagenKey
                        ? { image: imagenKey, width: 90, alignment: 'center', margin: [0, 0, 0, -10] }
                        : { text: ' ', margin: [0, 30, 0, 0] },
                    { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: '#000000' }], margin: [0, 10, 0, 4] },
                    { text: etiqueta, alignment: 'center', fontSize: 9 },
                    { text: `Aclaración: ${aclaracion ?? ''}`, alignment: 'center', fontSize: 9 },
                    { text: `DNI: ${dniFijo ?? ''}`, alignment: 'center', fontSize: 9 },
                ],
            });

            const filaFirmaPrincipal: Content = {
                columns: [
                    bloqueFirma('Firma representante colegio'),
                    bloqueFirma('Firma representante Crearte Buzos', 'Adrian Coassini', '18.380.631', 'firmaAdrian'),
                ],
                columnGap: 20,
                margin: [0, 30, 0, 0],
            };

            const filasFirmasExtra: Content[] = [];
            const firmantesExtra = dto.compradores.slice(1);
            for (let i = 0; i < firmantesExtra.length; i += 2)
            {
                const columnas = [bloqueFirma('Firma representante colegio')];
                if (firmantesExtra[i + 1]) columnas.push(bloqueFirma('Firma representante colegio'));
                filasFirmasExtra.push({
                    columns: columnas,
                    columnGap: 20,
                    margin: [0, 30, 0, 0],
                    ...(i === 0 ? { pageBreak: 'before' as const } : {}),
                });
            }

            const docDefinition: TDocumentDefinitions = {
                pageSize: 'A4',
                pageMargins: [45, 40, 45, 40],
                defaultStyle: { font: 'Roboto', fontSize: 9 },
                images: {
                    logoCrearte: `data:image/png;base64,${this.logoBase64}`,
                    firmaAdrian: `data:image/png;base64,${this.firmaAdrianBase64}`,
                },
                content: [
                    { image: 'logoCrearte', width: 160, alignment: 'center', margin: [0, 0, 0, 10] },
                    { text: 'ACUERDO DE PARTES', bold: true, fontSize: 14, alignment: 'center', margin: [0, 0, 0, 20] },

                    {
                        text: [
                            'En la Ciudad de Lomas de Zamora a los ', { text: dto.diaFecha, bold: true }, ' días del mes de ', { text: dto.mesFecha, bold: true },
                            ' del año ', { text: dto.anioFecha, bold: true }, ', entre el Sr. ', { text: 'Coassini Adrián Alejandro', bold: true },
                            ' (titular de la empresa Crearte Buzos de Egresados) con ', { text: 'DNI 18.380.631', bold: true },
                            ', en adelante la empresa vendedora, y el/los Sres/ras: ', compradoresTexto,
                            ' ; (se adjuntan copias DNI frente y dorso), representantes del colegio ', colegioTexto,
                            ', situado en la localidad de ', dto.localidad, ' de la provincia de ', dto.provincia,
                            '; en adelante la parte compradora, convienen en celebrar el presente acuerdo, que se regirá por las siguientes cláusulas:',
                        ],
                        alignment: 'justify',
                    },

                    { text: 'PRIMERA:', bold: true, margin: [0, 14, 0, 4] },
                    {
                        text: [{ text: 'Cantidades: ', bold: true }, `La parte vendedora se compromete a entregar la cantidad de ${listaProductosConUnidades}, con las características del boceto adjunto.`],
                        alignment: 'justify',
                    },

                    ...(hayBeneficios ? ([
                        { text: 'Beneficios / Bonificaciones:', bold: true, margin: [0, 10, 0, 4] },
                        {
                            text: 'En atención a la cantidad de prendas adquiridas, conforme lo detallado en el apartado PRIMERA, la empresa vendedora otorgará los siguientes beneficios y/o bonificaciones:',
                            alignment: 'justify',
                        },
                        { ul: dto.beneficios as string[], margin: [0, 4, 0, 6] },
                        {
                            text: 'Dichos beneficios estarán sujetos al cumplimiento íntegro de las obligaciones asumidas por la parte compradora; en caso de incumplimiento de cualquiera de ellas, los mismos quedarán automáticamente sin efecto, sin que ello genere derecho a reclamo alguno.',
                            alignment: 'justify',
                        },
                        { text: 'Los beneficios se entregarán junto con la totalidad del pedido.', margin: [0, 4, 0, 0] },
                    ] as Content[]) : []),

                    {
                        text: `La entrega total del pedido será efectiva por un total de ${listaProductosSimple}.`,
                        bold: true,
                        margin: [0, 10, 0, 10],
                        alignment: 'justify',
                    },

                    { text: 'SEGUNDA:', bold: true, margin: [0, 10, 0, 4], pageBreak: 'before' },

                    ...(dto.tieneSenia ? ([
                        {
                            text: [{ text: 'Seña: ', bold: true }, `La misma será de un monto fijo de $ ${formatearMonto(dto.montoSenia)}.-`],
                            margin: [0, 0, 0, 4],
                        },
                    ] as Content[]) : []),

                    {
                        text: `Una vez abonada la ${terminoSenia}, se comenzará a trabajar con los sectores de Talles y Diseño de la empresa para completar la planilla de talles y firma del boceto digital.`,
                        alignment: 'justify',
                        margin: [0, 0, 0, 6],
                    },
                    {
                        text: `Se deja expresa constancia que, ante el ingreso de la ${terminoSeniaCorto}, la empresa ya comienza a generar costos y gastos, es por ello que, ante el arrepentimiento de compra transcurridos los 15 días, se le reconocerá y devolverá el 50% de lo abonado oportunamente en concepto de ${terminoSeniaConcepto}, y transcurridos los 30 días, no se hará efectiva ninguna devolución. - (Art.1059 c.c. "La entrega de seña o arras se interpreta como confirmatoria del acto, excepto que las partes convengan la facultad de arrepentirse; en tal caso, quien entregó la señal la pierde en beneficio de la otra, y quien la recibió, debe restituirla doblada…").-`,
                        alignment: 'justify',
                        margin: [0, 0, 0, 10],
                    },

                    {
                        text: [
                            { text: 'Talles y medidas: ', bold: true },
                            'El área de talles de la empresa vendedora enviará al comprador un instructivo digital, un video tutorial y una tabla de medidas que detallarán el procedimiento para determinar correctamente el talle correspondiente de cada prenda para cada egresado/a. Con base en esta información, el comprador deberá completar una planilla digital (“planilla de talles”) consignando el nombre o apodo (en caso de llevar) y el talle seleccionado para cada egresado/a.',
                        ],
                        alignment: 'justify',
                        margin: [0, 0, 0, 6],
                    },
                    { text: 'Una vez confirmada dicha planilla de talles por un adulto representante del curso no se podrán realizar más modificaciones en la misma. Sin excepciones.', bold: true, alignment: 'justify', margin: [0, 0, 0, 6] },
                    { text: 'La empresa vendedora, no se responsabiliza por error en la información enviada de los talles y/o cantidades de los productos por la parte compradora. La misma se responsabiliza de entregar los productos pedidos en la planilla de talles indicada.', bold: true, alignment: 'justify', margin: [0, 0, 0, 10] },

                    {
                        text: [
                            { text: 'Diseño: ', bold: true },
                            'desde el sector de diseño de la empresa vendedora, se elaborará una ficha técnica del modelo elegido (boceto digital) y el comprador podrá ver cómo quedará dicho modelo, con las inscripciones, tipografías, técnicas de bordados y estampados elegidos por el curso. Podrán hacer las modificaciones que se consideren necesarias. En caso de agregado de inscripciones o modificaciones en el diseño, luego de haber confirmado el presupuesto, el precio variará según corresponda.',
                        ],
                        alignment: 'justify',
                        margin: [0, 0, 0, 6],
                    },
                    { text: 'Una vez firmado dicho boceto por un adulto representante del curso no se podrán realizar más modificaciones en el mismo. Sin excepciones.', bold: true, alignment: 'justify', margin: [0, 0, 0, 6] },
                    { text: 'La empresa vendedora, no se responsabiliza por error en la información enviada y aprobada del boceto y/o diseño por la parte compradora. La misma se responsabiliza de entregar los productos tal como figuran en el boceto firmado.', bold: true, alignment: 'justify', margin: [0, 0, 0, 10] },
                    { text: '*Tener en cuenta que el atraso de la parte compradora en la entrega de la confirmación de envío a producción; planilla de talles o boceto de diseño perjudicará directamente en la fecha de entrega de las prendas.', italics: true, alignment: 'justify' },

                    { text: 'TERCERA:', bold: true, margin: [0, 14, 0, 4], pageBreak: 'before' },
                    {
                        text: [{ text: 'Valores / cotización: ', bold: true }, `El precio convenido por dicha operación es de $ ${formatearMonto(dto.montoTotal)} el cual será abonado de la siguiente manera:`],
                        alignment: 'justify',
                        margin: [0, 0, 0, 6],
                    },
                    { text: primerParrafoValores, margin: [0, 0, 0, 6] },
                    { stack: detalleCuotas, margin: [0, 0, 0, 10] },

                    { text: 'Instancias de producción y Refinanciación:', bold: true, margin: [0, 0, 0, 4] },
                    { stack: instanciasProduccion, margin: [0, 0, 0, 10] },

                    {
                        text: [{ text: 'Plazos: ', bold: true }, `La parte vendedora se compromete a entregar la cantidad solicitada en la cláusula primera, en el mes de ${dto.mesEntrega} de ${dto.anioEntrega}. Donde deberán quedar extinguidos todos los compromisos de pago, asumidos en el presente. - No se hará entrega de la mercadería, si ésta no ha sido saldada/abonada en su totalidad.-`],
                        alignment: 'justify',
                    },

                    { text: 'CUARTA:', bold: true, margin: [0, 14, 0, 4], pageBreak: 'before' },
                    {
                        text: [
                            { text: 'Entrega: ', bold: true },
                            'El pedido será entregado en su totalidad, no permitiéndose ni autorizándose entregas parciales bajo ninguna circunstancia.',
                        ],
                        alignment: 'justify',
                        margin: [0, 0, 0, 6],
                    },
                    { text: 'La fecha de entrega no podrá exceder los treinta (30) días corridos posteriores a la fecha de entrega pactada, plazo de gracia que se contempla únicamente en casos de demora en la provisión de materia prima o atraso en el cumplimiento de las obligaciones de pago por parte del cliente.', alignment: 'justify', margin: [0, 0, 0, 6] },
                    { text: 'Se deja expresamente establecido que el atraso en el pago de cualquiera de las cuotas, en cualquier instancia en que se encuentre la producción, alterará y perjudicará directamente los plazos de entrega del pedido.', alignment: 'justify', margin: [0, 0, 0, 6] },
                    { text: 'Una vez que el pedido se encuentre finalizado y listo para su entrega, el mismo podrá:', margin: [0, 0, 0, 4] },
                    { text: [{ text: 'a) Ser retirado ', bold: true }, 'en su totalidad por un adulto previamente autorizado y representante del curso, en las oficinas de Crearte, ubicadas en Lomas de Zamora; o'], alignment: 'justify', margin: [0, 0, 0, 6] },
                    {
                        text: [
                            { text: 'b) Ser enviado ', bold: true },
                            'a través de una empresa de envíos (Vía cargo o Andreani) a la dirección que el colegio cliente indique. En este caso, el despacho del pedido se realizará dentro de las setenta y dos (72) horas posteriores a la acreditación del pago total de la última cuota. El envío se efectuará en una única entrega, deberá ser recibido por un adulto responsable y el costo del mismo correrá exclusivamente por cuenta del cliente. La parte vendedora se encargará de la gestión integral del envío con la empresa de transporte correspondiente, y una vez despachado el pedido, proporcionará a la parte compradora el número de guía y/o código de seguimiento correspondiente.',
                        ],
                        alignment: 'justify',
                        margin: [0, 0, 0, 10],
                    },
                    { text: [{ text: 'Garantía: ', bold: true }, 'Todos los productos tienen un 1 (un) año de garantía ante cualquier falla relacionada a fábrica, producción o equivocación de la empresa vendedora, no así por mal uso de la prenda.'], alignment: 'justify', margin: [0, 0, 0, 10] },
                    { text: [{ text: 'Agregados: ', bold: true }, 'Una vez entregado el pedido, el colegio si desea, puede solicitar agregados de combos con un mínimo de 5 unidades. La empresa NO producirá prendas inferiores al mínimo estipulado en esta cláusula. El precio de cada combo será el de la lista vigente a esa fecha, es decir, la actual. La confirmación de dicho pedido de agregados y confección de los mismos quedará sujeta a la disponibilidad de producción de ese momento.'], alignment: 'justify' },

                    { text: 'QUINTA:', bold: true, margin: [0, 14, 0, 4], pageBreak: 'before' },
                    { text: 'Incumplimientos:', bold: true, margin: [0, 0, 0, 6] },
                    { text: [{ text: 'En la entrega de planillas de talles, firma de boceto digital o confirmación de envío a producción: ', decoration: 'underline' }, 'El mismo afectará directamente a la fecha de Entrega de los productos.-'], alignment: 'justify', margin: [0, 0, 0, 6] },
                    { text: [{ text: 'En el pago de las cuotas: ', decoration: 'underline' }, 'En caso de atraso, en algunas de las cuotas pactadas en la cláusula tercera, se cobrará un interés punitorio mensual del 5% dado que los artículos sufren aumentos inflacionarios permanentemente. - Ambas partes acuerdan darle a este contrato el carácter de Título ejecutivo, para hacer efectivo el cobro en caso de Mora y/o no pago de los productos, y su reclamo se ajustará expresamente al procedimiento ejecutivo que establece nuestro código de procedimiento Civil y comercial.-'], alignment: 'justify', margin: [0, 0, 0, 6] },
                    { text: [{ text: 'Arrepentimiento del padre y/o alumno: ', decoration: 'underline' }, 'Luego de hacer efectivo el pedido, mediante la seña y el envío de planillas, y al haberse abonado la cuota Nro 1, los costos/saldos pendientes del Padre/alumno deudor y/o arrepentido, serán absorbidos en su totalidad por el conjunto de padres restantes, prorrateándose lo debido en partes iguales.- Caso contrario, toda la entrega en general se verá supeditada al pago total de las mismas.-'], alignment: 'justify', margin: [0, 0, 0, 10] },
                    { text: 'En prueba de conformidad y aceptación se firman de manera virtual dos ejemplares de igual tenor y a un solo efecto en el lugar y fecha pactada.', alignment: 'justify' },

                    filaFirmaPrincipal,
                    ...filasFirmasExtra,
                ],
            };

            const pdfDoc = this.printer.createPdf(docDefinition);
            return await pdfDoc.getBuffer();
        }
        catch (error)
        {
            this.logger.error('Error al generar el PDF del contrato', error);
            throw error;
        }
    }
}