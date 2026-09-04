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

    async traerPagosBanco(banco: string, rangoDesde:number, rangoHasta:number):Promise<PagoBancoResponse[]>
    {
        const { data, error } = await this.sb.supabase
            .from('pagos')
            .select(`*,
                pedidos!inner(id,estado_general, grupos(id,turno, orientacion, nivel,colegios(nombre, localidad)))`)
            .eq('banco', banco)
            .neq('pedidos.estado_general', "Entregado")
            .order('fecha', { ascending: false })
            .range(rangoDesde, rangoHasta);;

        if (error) 
        {
            throw new Error(error.message);
        }      

        const pagosBancos: PagoBancoResponse[] = data.map(pago => ({
                    id: pago.id,
                    fecha: pago.fecha,
                    nro_transferencia: pago.nro_transferencia,
                    entidad_pago: pago.entidad_pago,
                    banco: pago.banco,
                    monto: pago.monto,
                    nombre_colegio: pago.pedidos.grupos.colegios.nombre,
                    aprobado: pago.aprobado,
                    enviado_banco: pago.enviado_banco,
                    motivo:pago.motivo,
                    localidad:pago.pedidos.grupos.colegios.localidad,
                    turno: pago.pedidos.grupos.turno,
                    orientacion: pago.pedidos.grupos.orientacion,
                    nivel:pago.pedidos.grupos.nivel,
                    id_grupo:pago.pedidos.grupos.id,
                    id_pedido:pago.pedidos.id,
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
        const { data, error } = await this.sb.supabase
        .from("pagos")
        .update({ 'enviado_banco': dto.nuevoValor})
        .eq("id", Number(dto.idPago));

        if (error) 
        {
            throw new Error(error.message);
        }
    }

    async modificarAprobadoBanco(dto: ModificarPago)
    {
        const { data, error } = await this.sb.supabase
        .from("pagos")
        .update({ 'aprobado': dto.nuevoValor})
        .eq("id", Number(dto.idPago));

        if (error) 
        {
            throw new Error(error.message);
        }
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
            throw new BadRequestException('El archivo enviado no es válido');
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
                '(?:N[°º]?\\.?|Nro\\.?|Número)\\s*de\\s*(?:operación|transacción|comprobante)' +
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
            .filter(d => d.tipo === 'completa' || d.tipo === 'parcial')
            .map(d => d.tipo === 'parcial' ? `Cuota ${d.numero} (parcial)` : `Cuota ${d.numero}`);

        return partes.length > 0 ? this.unirConY(partes) : 'Cuota';
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
        const primerDia = new Date(fechaHoy.getFullYear(),fechaHoy.getMonth(),1);
        const primerDiaMesSiguiente = new Date(fechaHoy.getFullYear(),fechaHoy.getMonth() + 1,1);

        const { data, error } = await this.sb.supabase
        .from('pagos')
        .select('monto')
        .gte('fecha', primerDia.toISOString())
        .lt('fecha', primerDiaMesSiguiente.toISOString())
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
}
