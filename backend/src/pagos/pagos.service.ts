import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { PagoDTO } from './dto/pago.dto';
import { PagoResponseDTO } from './dto/pagoResponse.dto';
import { OcrService } from 'src/ocr/ocr.service';
import { text } from 'stream/consumers';
import { Console } from 'console';
import { PagoComprobanteDatosDTO } from './dto/pagoComprobanteDatos.dto';
import { PagoBancoResponse } from './dto/pagoBancoResponse.dto';
import { ModificarPago } from './dto/modificarBanco.dto';
import { CuotasService } from 'src/cuotas/cuotas.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { GenerarReciboDTO } from 'src/reportes/pdf/dto/generarRecibo.dto';
import { DetalleCuotaPago } from './dto/detalleCuotaPago.dto';
import { FiltrosPagosBancoDTO } from './dto/filtrosPagosBanco.dto';
import { ResumenPagosBancoDTO } from './dto/resumenPagosBanco.dto';

// Pago negativo que se carga al cancelar un pedido con devolución de la plata
export const MOTIVO_DEVOLUCION = 'Devolución';

@Injectable()
export class PagosService 
{
    constructor(private sb: SupabaseService, private ocrService: OcrService, private documentosService: DocumentosService){}

    async crearPago(dto: PagoDTO)
    {
        const { documentoDTO, ...pagoInsert } = dto;

        let idDocumento: number | undefined;

        if (documentoDTO)
        {
            const ids = await this.documentosService.subirDocumento(documentoDTO);
            idDocumento = ids[0];
        }

        const { data, error } = await this.sb.supabase
            .rpc('registrar_pago_completo', {
                p_pago: { ...pagoInsert, id_documento: idDocumento ?? null },
            });

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        return data;
    }

    async traerPagosPedido(idPedido: number):Promise<PagoResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('pagos')
            .select(`*`)
            .eq('id_pedido', idPedido)

        if (error) 
        {
            throw new Error(error.message);
        }        

        return data as PagoResponseDTO[];
    }

    async traerPagosBanco(banco: string, rangoDesde:number, rangoHasta:number, filtros: FiltrosPagosBancoDTO = {}):Promise<PagoBancoResponse[]>
    {
        const query = this.consultaPagosBanco(banco, filtros, false);

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(rangoDesde, rangoHasta);

        if (error) 
        {
            throw new Error(error.message);
        }      

        const pagosBancos: PagoBancoResponse[] = data.map(pago => ({
                    id: pago.id!,
                    fecha: pago.fecha,
                    fecha_recepcion: pago.created_at!,
                    nro_transferencia: pago.nro_transferencia,
                    entidad_pago: pago.entidad_pago,
                    banco: pago.banco,
                    monto: pago.monto,
                    nombre_colegio: pago.nombre_colegio!,
                    aprobado: pago.aprobado,
                    enviado_banco: pago.enviado_banco,
                    motivo:pago.motivo,
                    localidad:pago.localidad!,
                    turno: pago.turno,
                    orientacion: pago.orientacion,
                    nivel:pago.nivel,
                    id_grupo:pago.id_grupo!,
                    id_pedido:pago.id_pedido!,
                }));

        return pagosBancos
    }

    async obtenerTotalIngresosEfectivo():Promise<number>
    {
        let total = 0;

        const { data, error } = await this.sb.supabase
        .from('pagos')
        .select('monto')
        .eq('banco', 'Efectivo');

        if (error) 
        {
            throw new Error(error.message);
        }    

        if(data)
        {    
            total = data.reduce((total, pago) => total + (pago.monto ?? 0), 0);
        }
        
        return total;          
    }

    async modificarEnviadoBanco(dto: ModificarPago)
    {
        const ids = await this.obtenerIdsMismoComprobante(Number(dto.idPago));

        const { data, error } = await this.sb.supabase
        .from("pagos")
        .update({ 'enviado_banco': dto.nuevoValor})
        .in("id", ids);

        if (error) 
        {
            throw new Error(error.message);
        }
    }

    async modificarAprobadoBanco(dto: ModificarPago)
    {
        const ids = await this.obtenerIdsMismoComprobante(Number(dto.idPago));

        const { data, error } = await this.sb.supabase
        .from("pagos")
        .update({ 'aprobado': dto.nuevoValor})
        .in("id", ids);

        if (error) 
        {
            throw new Error(error.message);
        }
    }

    // Mismos filtros que la tabla, así los contadores coinciden con lo que se ve
    async traerResumenPagosBanco(banco: string, filtros: FiltrosPagosBancoDTO = {}): Promise<ResumenPagosBancoDTO>
    {
        const [total, pendientesEnvio, aprobados, rechazados] = await Promise.all([
            this.consultaPagosBanco(banco, filtros, true),
            this.consultaPagosBanco(banco, filtros, true).eq('aprobado', true).eq('enviado_banco', false),
            this.consultaPagosBanco(banco, filtros, true).eq('aprobado', true),
            this.consultaPagosBanco(banco, filtros, true).eq('aprobado', false),
        ]);

        const error = total.error ?? pendientesEnvio.error ?? aprobados.error ?? rechazados.error;
        if (error)
        {
            throw new Error(error.message);
        }

        return {
            total: total.count ?? 0,
            pendientesEnvio: pendientesEnvio.count ?? 0,
            aprobados: aprobados.count ?? 0,
            rechazados: rechazados.count ?? 0,
        };
    }

    // Consulta de Cuentas Bancarias con la búsqueda y los filtros aplicados.
    // soloContar: devuelve solo la cantidad de filas (para los contadores), sin traer los datos.
    private consultaPagosBanco(banco: string, filtros: FiltrosPagosBancoDTO, soloContar: boolean)
    {
        // Una línea por comprobante: la vista junta las filas en que se partió un mismo pago (seña + cuotas)
        let query = this.sb.supabase
            .from('pagos_banco')
            .select('*', soloContar ? { count: 'exact', head: true } : undefined)
            .eq('banco', banco)
            .neq('estado_general', "Entregado");

        // Búsqueda: por nombre de colegio, o por monto exacto si lo escrito es un número ("43.500", "$ 43500")
        // (comas, paréntesis y comillas se sacan del texto porque rompen el filtro .or de Supabase)
        const busqueda = filtros.busqueda?.replace(/[,()"]/g, ' ').trim();
        if (busqueda)
        {
            const monto = this.parsearMontoBusqueda(filtros.busqueda!);
            query = monto !== null
                ? query.or(`nombre_colegio.ilike.%${busqueda}%,monto.eq.${monto}`)
                : query.ilike('nombre_colegio', `%${busqueda}%`);
        }

        // Fecha de recepción (timestamp): días completos en hora de Argentina
        if (filtros.recepcionDesde) query = query.gte('created_at', `${filtros.recepcionDesde}T00:00:00-03:00`);
        if (filtros.recepcionHasta) query = query.lt('created_at', this.inicioDiaSiguiente(filtros.recepcionHasta));

        // Fecha de pago (date)
        if (filtros.pagoDesde) query = query.gte('fecha', filtros.pagoDesde);
        if (filtros.pagoHasta) query = query.lte('fecha', filtros.pagoHasta);

        // Monto (del comprobante completo, ya sumado en la vista)
        const montoDesde = Number(filtros.montoDesde);
        const montoHasta = Number(filtros.montoHasta);
        if (filtros.montoDesde && !isNaN(montoDesde)) query = query.gte('monto', montoDesde);
        if (filtros.montoHasta && !isNaN(montoHasta)) query = query.lte('monto', montoHasta);

        if (filtros.aprobado === 'true' || filtros.aprobado === 'false') query = query.eq('aprobado', filtros.aprobado === 'true');
        if (filtros.enviado === 'true' || filtros.enviado === 'false') query = query.eq('enviado_banco', filtros.enviado === 'true');

        return query;
    }

    // "43.500", "$ 43.500,50" o "43500" -> número. Si no es un monto, null.
    private parsearMontoBusqueda(texto: string): number | null
    {
        const limpio = texto.replace(/\$/g, '').replace(/\s/g, '');
        if (!/^\d[\d.]*(,\d{1,2})?$/.test(limpio)) return null;
        return Number(limpio.replace(/\./g, '').replace(',', '.'));
    }

    private inicioDiaSiguiente(fecha: string): string
    {
        const dia = new Date(`${fecha}T00:00:00-03:00`);
        dia.setUTCDate(dia.getUTCDate() + 1);
        return dia.toISOString();
    }

    // Un mismo pago puede haberse guardado en varias filas con el mismo comprobante (seña + cuotas).
    // En Cuentas Bancarias son una sola línea, así que los cambios se aplican a todas.
    private async obtenerIdsMismoComprobante(idPago: number): Promise<number[]>
    {
        const { data: pago, error } = await this.sb.supabase
        .from("pagos")
        .select("id, id_pedido, id_documento")
        .eq("id", idPago)
        .single();

        if (error)
        {
            throw new Error(error.message);
        }

        if (pago.id_documento === null) return [pago.id];

        const { data: filas, error: errorFilas } = await this.sb.supabase
        .from("pagos")
        .select("id")
        .eq("id_pedido", pago.id_pedido!)
        .eq("id_documento", pago.id_documento);

        if (errorFilas)
        {
            throw new Error(errorFilas.message);
        }

        return filas.map(f => f.id);
    }

    async comprobarComprobantePago(archivo: Buffer): Promise<PagoComprobanteDatosDTO>
    {
        let textoImagen = await this.ocrService.extraerTexto(archivo);
        let textoProcesado = (textoImagen.toLocaleLowerCase()).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let datosComprobante: PagoComprobanteDatosDTO = new PagoComprobanteDatosDTO();

        const nombresTransferencia = ["coassini adrian alejandro", "centro logistico sur srl"];
        const textoSinEspacios = textoProcesado.replace(/\s/g, '');
        if (textoSinEspacios.includes("centrologisticosursrl"))
        {
            datosComprobante.banco = "COMAFI";
        }
        else if (textoSinEspacios.includes("coassiniadrianalejandro"))
        {
            datosComprobante.banco = "Santander";
        }
        else
        {
            // No se detectó una cuenta de la empresa: el front muestra un aviso propio y permite cargar los datos a mano
            throw new BadRequestException({
                codigo: 'CUENTA_DESTINO_INVALIDA',
                message: 'El comprobante no es una transferencia a una cuenta de Crearte.',
            });
        }

        datosComprobante.nro_transferencia = this.determinarNroComprobante(textoImagen);
        datosComprobante.monto = this.determinarMonto(textoImagen);

        if(datosComprobante.nro_transferencia == "" || datosComprobante.monto == 0)
        {
            throw new BadRequestException('El archivo enviado no es válido');
        }

        return datosComprobante;
    }

    private determinarNroComprobante(textoImagen:string): string
    {
        let codigo = "";
        const REGEX_NRO_OPERACION = new RegExp(
            '(?:' +
                '(?:N\\.?[°º]?|Nro\\.?|Número)\\s*de\\s*(?:operación|transacción|comprobante)' +
                '(?:\\s*de\\s*Mercado\\s*Pago)?' +
                '|' +
                'Código\\s*de\\s*(?:transacción|referencia)' +
            ')' +
            '\\s*:?\\s*' +
            '([a-zA-Z0-9-]+)',
            'i');

        const match = textoImagen.match(REGEX_NRO_OPERACION);
        if (match != null)
        {
            codigo = match?.[1];
        }
        return codigo;
    }

    private determinarMonto(textoImagen: string): number
    {
        let monto = 0;

        const REGEX_MONTO_CON_LABEL = /(?:Importe\s*debitado|Monto)\s*:?\s*\$?\s*([\d.]+(?:,\d{1,2})?)/i;
        let match = textoImagen.match(REGEX_MONTO_CON_LABEL);

        if (match == null)
        {
            const REGEX_MONTO_GENERICO = /\$\s*([\d.]+(?:,\d{1,2})?)/;
            match = textoImagen.match(REGEX_MONTO_GENERICO);
        }

        const montoCrudo = match?.[1];

        if (match != null && montoCrudo != null)
        {
            monto = this.parsearMonto(montoCrudo);
        }

        return monto;
    }

    private parsearMonto(montoStr: string): number 
    {
        const partes = montoStr.split(',');
        const parteEntera = partes[0].replace(/\./g, ''); 
        const parteDecimal = partes[1] ?? '00'; 
        return parseFloat(`${parteEntera}.${parteDecimal}`);
    }    

    async traerIdDocumento(idPago:number):Promise<number | null>
    {
        const { data, error } = await this.sb.supabase
        .from('pagos')
        .select(`
            id_documento
        `)
        .eq('id', idPago)
        .single();

        if (error)
        {
            throw new Error(error.message);
        }

        return data.id_documento;
    }

    async armarDatosRecibo(idPago: number): Promise<GenerarReciboDTO>
    {
        const { data: pago, error: errPago } = await this.sb.supabase
            .from('pagos')
            .select('id, id_pedido, monto, fecha, motivo, detalle_cuotas')
            .eq('id', idPago)
            .single();

        if (errPago || !pago)
        {
            throw new BadRequestException(errPago?.message ?? 'No se encontró el pago.');
        }

        if (!pago.id_pedido)
        {
            throw new BadRequestException('El pago no está asociado a ningún pedido.');
        }

        const { data: pedido, error: errPedido } = await this.sb.supabase
            .from('pedidos')
            .select('id_grupo')
            .eq('id', pago.id_pedido)
            .single();

        if (errPedido || !pedido)
        {
            throw new BadRequestException(errPedido?.message ?? 'No se encontró el pedido del pago.');
        }

        const { data: grupo, error: errGrupo } = await this.sb.supabase
            .from('grupos')
            .select('turno, orientacion, nivel, colegios!inner (nombre, localidad)')
            .eq('id', pedido.id_grupo)
            .single();

        if (errGrupo || !grupo)
        {
            throw new BadRequestException(errGrupo?.message ?? 'No se encontró el colegio del pago.');
        }

        const { data: padres, error: errPadres } = await this.sb.supabase
            .from('padres_responsables')
            .select('nombre, apellido')
            .eq('id_grupo', pedido.id_grupo)
            .limit(1);

        if (errPadres)
        {
            throw new BadRequestException(errPadres.message);
        }

        const { count: nroCuotas, error: errCuotas } = await this.sb.supabase
            .from('cuotas')
            .select('id', { count: 'exact', head: true })
            .eq('id_pedido', pago.id_pedido);

        if (errCuotas)
        {
            throw new BadRequestException(errCuotas.message);
        }

        const padre = padres?.[0];

        return {
            numero: String(pago.id).padStart(6, '0'),
            fecha: new Date(pago.fecha ?? '').toLocaleDateString('es-AR'),
            clienteNombre: grupo.colegios.nombre,
            localidad: grupo.colegios.localidad,
            concepto: this.armarConceptoRecibo(pago.motivo, pago.detalle_cuotas as unknown as DetalleCuotaPago[] | null),
            importe: pago.monto ?? 0,
            leyendaSenia: pago.motivo === 'Seña',
            turno: grupo.turno ?? '',
            orientacion: grupo.orientacion ?? '-',
            nivel: grupo.nivel ?? '',
            nombrePadre: padre?.nombre ?? '',
            apellidoPadre: padre?.apellido ?? '',
            nroCuotas: nroCuotas ?? 0,
        };
    }

    private armarConceptoRecibo(motivo: string | null, detalle: DetalleCuotaPago[] | null): string
    {
        if (!detalle || detalle.length === 0)
        {
            return motivo === 'Seña' ? 'Seña' : 'Cuota';
        }

        if (detalle.some(d => d.tipo === 'senia'))
        {
            return 'Seña';
        }

        const partes = detalle
            .filter(d => d.tipo === 'completa' || (d.tipo === 'parcial' && (d.monto ?? 0) >= 0.01))
            .map(d => {
                const monto = this.formatearMontoRecibo(d.monto);
                return d.tipo === 'parcial' ? `Cuota ${d.numero} (parcial) ($ ${monto})` : `Cuota ${d.numero} ($ ${monto})`;
            });

        return partes.length > 0 ? this.unirConY(partes) : 'Cuota';
    }

    private formatearMontoRecibo(monto?: number): string
    {
        return (monto ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    private unirConY(items: string[]): string
    {
        if (items.length === 0) return '';
        if (items.length === 1) return items[0];
        return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
    }

    async traerMontoTotalMes(fechaHoy:Date):Promise<number>
    {
        let total = 0;
        // El mes se determina en hora argentina (no en la del servidor, que suele ser UTC)
        const [anio, mes] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' })
            .format(fechaHoy)
            .split('-')
            .map(Number);
        const anioSiguiente = mes === 12 ? anio + 1 : anio;
        const mesSiguiente = mes === 12 ? 1 : mes + 1;
        const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
        const primerDiaMesSiguiente = `${anioSiguiente}-${String(mesSiguiente).padStart(2, '0')}-01`;

        const { data, error } = await this.sb.supabase
        .from('pagos')
        .select('monto')
        .gte('fecha', primerDia)
        .lt('fecha', primerDiaMesSiguiente)
        .neq('banco', 'Efectivo');

        if (error) 
        {
            throw new Error(error.message);
        }    

        if(data)
        {    
            total = data.reduce((total, pago) => total + (pago.monto ?? 0), 0);
        }
        
        return total;  
    }

    async eliminarPago(idPago:number)
    {
        const { data, error } = await this.sb.supabase.rpc(
            'eliminar_pago_completo',
            {p_id_pago: idPago}
        );

        if (error)
        {
            throw new BadRequestException(error.message);
        }
        return data;        
    }

    // Baja de un colegio: un pago negativo que contrarresta todo lo pagado (los pagos originales quedan).
    // Se suman TODOS los pagos, incluida una devolución anterior: si ya se devolvió, da 0 y no se inserta otra.
    async devolverPagos(idPedido:number, banco:string)
    {
        const pagos = await this.traerPagosPedido(idPedido);
        const totalPagado = Math.round(pagos.reduce((total, pago) => total + Number(pago.monto ?? 0), 0) * 100) / 100;

        if (totalPagado <= 0)
        {
            return;
        }

        // Fecha de hoy en Argentina (toISOString es UTC: después de las 21 hs daría el día siguiente)
        const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

        const { error } = await this.sb.supabase
        .from('pagos')
        .insert({id_pedido: idPedido, monto: -totalPagado, motivo: MOTIVO_DEVOLUCION, fecha: hoy, aprobado: true, banco: banco});

        if (error)
        {
            throw new BadRequestException(error.message);
        }
    }
}
