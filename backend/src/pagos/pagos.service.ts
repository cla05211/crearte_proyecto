import { Injectable } from '@nestjs/common';
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

@Injectable()
export class PagosService 
{
    constructor(private sb: SupabaseService, private ocrService: OcrService){}

    async crearPago(dto: PagoDTO)
    {
        const {data,error} = await this.sb.supabase
            .from('pagos')
            .insert(dto)
            .select('id')
            .single();

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data.id;
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

    async traerPagosBanco(banco: string):Promise<PagoBancoResponse[]>
    {
        const { data, error } = await this.sb.supabase
            .from('pagos')
            .select(`*,
                pedidos!inner(estado_general, grupos(colegios(nombre)))`)
            .eq('banco', banco)
            .neq('pedidos.estado_general', "entregado");

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
                    enviado_banco: pago.enviado_banco
                }));
        
        return pagosBancos
    }

    async comprobarComprobantePago(archivo: Buffer): Promise<PagoComprobanteDatosDTO>
    {
        let textoImagen = await this.ocrService.extraerTexto(archivo);
        let textoProcesado = (textoImagen.toLocaleLowerCase()).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let datosComprobante: PagoComprobanteDatosDTO = new PagoComprobanteDatosDTO();

        const nombresTransferencia = ["coassini adrian alejandro", "centro logistico sur srl"];

        if (textoProcesado.includes("centro logistico sur srl"))
        {
            datosComprobante.banco = "COMAFI";
        }
        else if (textoProcesado.includes("coassini adrian alejandro"))
        {
            datosComprobante.banco = "Santander";
        }
        else
        {
            throw new BadRequestException('El archivo enviado no es válido');
        }
        datosComprobante.nro_transferencia = this.determinarNroComprobante(textoImagen);
        datosComprobante.monto = this.determinarMonto(textoImagen);

        console.log(datosComprobante);
        return datosComprobante;
    }

    async modificarEnviadoBanco(dto: ModificarPago)
    {
        const { data, error } = await this.sb.supabase
        .from("pagos")
        .update({ 'enviado_banco': dto.nuevoValor})
        .eq("id", dto.idPago);

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
        .eq("id", dto.idPago);

        if (error) 
        {
            throw new Error(error.message);
        }
    }

    private determinarNroComprobante(textoImagen:string): string
    {
        let codigo = "";
        const REGEX_NRO_OPERACION = new RegExp(
            '(?:' +
                '(?:N[°º]?\\.?|Nro\\.?|Número)\\s*de\\s*(?:operación|transacción)' +
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

    private determinarMonto(textoImagen:string):number
    {
        let monto = 0;

        const REGEX_MONTO = /\$\s*([\d.]+(?:,\d{1,2})?)/;
        const match = textoImagen.match(REGEX_MONTO);
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
}
