import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { MovimientosCajaService } from 'src/movimientos-caja/movimientos-caja.service';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { StorageService } from 'src/storage/storage.service';
import { ArchivoSubidoDTO } from 'src/storage/dto/ArchivoSubidoDTO';
import { COLUMNAS_DATO_SIMPLE, modificarDatoSimpleDto } from './dto/modificarDatoSimpleDto';
import { confirmarEntregaDto } from './dto/confirmarEntregaDto';
import { pedidoListoParaEnviarDto } from './dto/traerPedidoEnvioDto';
import { pedidoEntregadoDto } from './dto/traerPedidoEntregadoDto';

const ESTADO_LISTO_PARA_ENTREGAR = 'Listo para entregar';
const ESTADO_ENTREGADO = 'Entregado';
const FORMAS_ENTREGA = ['Envio', 'Retiro oficina', 'Comisionista'];

@Injectable()
export class GestionEnviosPedidosService 
{
    constructor(
        private sb: SupabaseService,
        private documentosService: DocumentosService,
        private cajaService: MovimientosCajaService,
        private pedidosService: PedidosService,
        private storageService: StorageService,
    ){}

    // Pasa el pedido a "Listo para entregar" y crea su fila de envío.
    // Zona sur -> 'Retiro oficina', el resto -> 'Envio'. La fecha de entrega arranca con la aproximada del pedido.
    // Si la fila ya existía (el pedido salió y volvió) no se pisa.
    async marcarListoParaEntregar(idPedido: number): Promise<void>
    {
        const { data: pedido, error } = await this.sb.supabase
        .from("pedidos")
        .select(`fecha_entrega_aproximada, grupos!inner(colegios!inner(zona_sur))`)
        .eq("id", idPedido)
        .single();

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        const { error: errorEnvio } = await this.sb.supabase
        .from("pedidos_envio")
        .upsert({
            id_pedido: idPedido,
            forma_entrega: pedido.grupos.colegios.zona_sur ? 'Retiro oficina' : 'Envio',
            fecha_entrega: pedido.fecha_entrega_aproximada,
        }, { onConflict: 'id_pedido', ignoreDuplicates: true });

        if (errorEnvio)
        {
            throw new BadRequestException(errorEnvio.message);
        }

        await this.pedidosService.modificarEstadoGeneralPedido(idPedido, ESTADO_LISTO_PARA_ENTREGAR);
    }

    // Pedidos de las tablas "Envío por correo" y "Retiro por oficina" (se separan por formaEntrega en el front)
    async traerPedidosListosParaEnviar(): Promise<pedidoListoParaEnviarDto[]>
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos_envio")
        .select(`*,
            pedido:pedidos!inner(estado_general, fecha_entrega_aproximada, envio_gratis, nro_fabrica,
                grupo:grupos!inner(id, contratos(firmado)))`)
        .eq("entregado", false)
        .eq("pedido.estado_general", ESTADO_LISTO_PARA_ENTREGAR)
        .order("id_pedido", { ascending: true });

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        return data.map(p => ({
            idPedido: p.id_pedido,
            nroPedido: p.pedido.nro_fabrica,
            estado: p.estado,
            pagoRealizado: p.pago_realizado,
            cantBultos: p.cant_bultos,
            empresaEnvio: p.empresa_envio,
            datosEnvio: p.datos_envio,
            cotizacion: p.cotizacion,
            idComprobante: p.id_comprobante,
            calendario: p.calendario,
            fechaEntrega: p.fecha_entrega,
            formaEntrega: p.forma_entrega,
            contratoFirmado: p.pedido.grupo.contratos.some(c => c.firmado === true),
            envioGratis: p.pedido.envio_gratis ?? false,
            fechaEntregaAproximada: p.pedido.fecha_entrega_aproximada,
        }));
    }

    // Pedidos entregados en el mes y año elegidos (por la fecha de entrega que se cargó al confirmar)
    async traerPedidosEnviados(mesEntrega: number, anioEntrega: number): Promise<pedidoEntregadoDto[]>
    {
        if (mesEntrega < 1 || mesEntrega > 12)
        {
            throw new BadRequestException('Mes de entrega inválido.');
        }

        const mes = String(mesEntrega).padStart(2, '0');
        const desde = `${anioEntrega}-${mes}-01`;
        const hasta = mesEntrega === 12
            ? `${anioEntrega + 1}-01-01`
            : `${anioEntrega}-${String(mesEntrega + 1).padStart(2, '0')}-01`;

        const { data, error } = await this.sb.supabase
        .from("pedidos_envio")
        .select(`id_pedido, fecha_entrega, forma_entrega, pedido:pedidos!inner(nro_fabrica)`)
        .eq("entregado", true)
        .gte("fecha_entrega", desde)
        .lt("fecha_entrega", hasta)
        .order("fecha_entrega", { ascending: false });

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        return data.map(p => ({
            idPedido: p.id_pedido,
            nroPedido: p.pedido.nro_fabrica,
            fechaEntrega: p.fecha_entrega,
            formaEntrega: p.forma_entrega,
        }));
    }

    async modificarDatoSimple(idPedido: number, dto: modificarDatoSimpleDto): Promise<void>
    {
        // El tipo de "columna" no existe en runtime: sin esto se podría mandar 'entregado' o 'id_movimiento_caja'
        if (!COLUMNAS_DATO_SIMPLE.includes(dto.columna))
        {
            throw new BadRequestException('Columna no modificable.');
        }

        const { error } = await this.sb.supabase
        .from("pedidos_envio")
        .update({ [dto.columna]: dto.dato } as any)
        .eq('id_pedido', idPedido);
 
        if (error)
        {
            throw new BadRequestException(error.message);
        }
    }
   
    // Guarda la cotización. Si el envío es gratis la refleja como egreso en caja:
    // la primera vez lo crea y después lo actualiza (id_movimiento_caja), así no se duplica.
    // Si se borra la cotización o el envío no es gratis, se borra el egreso.
    async modificarCotizacion(idPedido: number, cotizacion: number | null, idUsuario: number): Promise<void>
    {
        if (cotizacion !== null && (!Number.isFinite(cotizacion) || cotizacion < 0))
        {
            throw new BadRequestException('La cotización no es válida.');
        }

        const { data: envio, error } = await this.sb.supabase
        .from("pedidos_envio")
        .select(`id_movimiento_caja, pedido:pedidos!inner(envio_gratis, nro_fabrica)`)
        .eq("id_pedido", idPedido)
        .single();

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        let idMovimiento = envio.id_movimiento_caja;

        if (envio.pedido.envio_gratis && cotizacion !== null && cotizacion > 0)
        {
            if (idMovimiento)
            {
                const { error: errorCaja } = await this.sb.supabase
                .from("movimientos_caja")
                .update({ monto: cotizacion })
                .eq("id", idMovimiento);

                if (errorCaja)
                {
                    throw new BadRequestException(errorCaja.message);
                }
            }
            else
            {
                idMovimiento = await this.cajaService.crearMovimiento({
                    fecha: this.fechaArgentina(),
                    monto: cotizacion,
                    categoria: "Envíos",
                    descripcion: `Envío gratis pedido ${envio.pedido.nro_fabrica ?? '#' + idPedido}`,
                    usuario: idUsuario,
                    tipo: "egreso",
                });
            }
        }
        else if (idMovimiento)
        {
            await this.cajaService.eliminarMovimiento(idMovimiento);
            idMovimiento = null;
        }

        const { error: errorEnvio } = await this.sb.supabase
        .from("pedidos_envio")
        .update({ cotizacion, id_movimiento_caja: idMovimiento })
        .eq("id_pedido", idPedido);

        if (errorEnvio)
        {
            throw new BadRequestException(errorEnvio.message);
        }
    }

    // Pasa el pedido a "Pedidos entregados"
    async confirmarEntrega(idPedido: number, dto: confirmarEntregaDto): Promise<void>
    {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.fechaEntrega ?? ''))
        {
            throw new BadRequestException('Falta la fecha de entrega.');
        }

        if (!FORMAS_ENTREGA.includes(dto.formaEntrega))
        {
            throw new BadRequestException('Forma de entrega inválida.');
        }

        const { error } = await this.sb.supabase
        .from("pedidos_envio")
        .update({ entregado: true, fecha_entrega: dto.fechaEntrega, forma_entrega: dto.formaEntrega })
        .eq("id_pedido", idPedido);

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        await this.pedidosService.modificarEstadoGeneralPedido(idPedido, ESTADO_ENTREGADO);
    }

    // Sube el comprobante de pago del envío (solo Via cargo: lo exige el check de la tabla)
    async subirComprobante(idPedido: number, archivo: ArchivoSubidoDTO): Promise<number>
    {
        if (!archivo)
        {
            throw new BadRequestException('No se recibió ningún archivo.');
        }

        const { data: pedido, error } = await this.sb.supabase
        .from("pedidos")
        .select("id_grupo, pedidos_envio!inner(empresa_envio)")
        .eq("id", idPedido)
        .single();

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        if (pedido.pedidos_envio?.empresa_envio !== 'Via cargo')
        {
            throw new BadRequestException('El comprobante solo se carga para envíos por Via cargo.');
        }

        const nombreArchivo = `comprobante-envio-${idPedido}-${Date.now()}-${archivo.originalname}`
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '-');

        const ruta = await this.storageService.guardarImagen(
            { pedidoId: idPedido.toString(), nombreArchivo, carpetaGuardado: 'comprobantes-envios' },
            archivo,
        );

        const [idDocumento] = await this.documentosService.subirDocumento({
            id_grupo: pedido.id_grupo,
            tipo: 'Comprobante envío',
            archivo_url: ruta,
        });

        await this.modificarComprobante(idPedido, idDocumento);

        return idDocumento;
    }

    private async modificarComprobante(idPedido: number, idDocumento: number): Promise<void>
    {      
        const { error } = await this.sb.supabase
        .from("pedidos_envio")
        .update({ id_comprobante: idDocumento })
        .eq("id_pedido", idPedido);

        if (error)
        {
            throw new BadRequestException(error.message);
        }
    }

    private fechaArgentina(): string
    {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
    }
}
