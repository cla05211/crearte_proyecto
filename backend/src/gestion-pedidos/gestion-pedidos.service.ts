import { Injectable, Logger } from '@nestjs/common';
import { ColegiosService } from 'src/colegios/colegios.service';
import { CrearPedidoDTO } from './dto/crearPedido.dto';
import { GruposService } from 'src/grupos/grupos.service';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { ProductosPedidoService } from 'src/productos-pedido/productos-pedido-service.service';
import { ProductoPedidoDTO } from 'src/productos-pedido/dto/ProductoPedido.dto';
import { PadreResponsableService } from 'src/padre-responsable/padre-responsable-service.service';
import { PadreResponsableDTO } from 'src/padre-responsable/dto/padreResponsable.dto';
import { AlumnoResponsableService } from 'src/alumno-responsable/alumno-responsable.service';
import { alumnoResponsableDTO } from 'src/alumno-responsable/dto/alumnoResponsable.dto';
import { DocumentosService } from 'src/documentos/documentos.service';
import { DocumentoDTO } from 'src/documentos/dto/documento.dto';
import { PagosService } from 'src/pagos/pagos.service';
import { CuentaCorrienteService } from 'src/cuenta-corriente/CuentaCorriente.service';
import { CuotasService } from 'src/cuotas/cuotas.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { PedidoResponseVentas } from './dto/PedidoResponseVentas.dto';
import { AuditoriasService } from 'src/auditorias/auditorias.service';
import { ModificarPlanPedidoDTO } from './dto/ModificarPlanPedido';
import { Json } from 'src/types/supabase';
import { PedidoDTOResponse } from 'src/pedidos/dto/pedidoResponse.dto';
import { ProductoPedidoResponseDTO } from 'src/productos-pedido/dto/ProductoPedidoResponse.dto copy';
import { presupuestoPedidoClientesPage } from './dto/PresupuestoPedidoClientePage.dto';
import { ProductoPedidoResponseConNombreOriginalDTO } from 'src/productos-pedido/dto/ProductoPedidoResponse.dto';
import { AgregadosGlobalesPedidoService } from 'src/agregados-globales-pedido/agregados-globales-pedido.service';
import { AgregadoGlobalPedidoResponseDTO } from 'src/agregados-globales-pedido/dto/AgregadoGlobalPedidoResponse.dto';
import { ControlTallesDisenioDTO } from './dto/ControlTallesDisenioDTO';
import { BeneficioPedidoDTO } from 'src/beneficios-pedido/dto/beneficioPedidoDTO';
import { BeneficiosPedidoService } from 'src/beneficios-pedido/beneficios-pedido.service';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { ControlProduccionDTO, EstadoPrenda } from './dto/ControlProduccionDTO';
import { ControlBanderasDTO, EstadoBocetoBandera, ModificarBanderaDTO, OrigenBandera } from './dto/ControlBanderasDTO';

const CAMPERAS_BUZOS = [63,64,67,68,69,70,71];
const CHOMBAS_REMERAS = [65,66,67,68,69,70];
const PANTALONES = [72];
const ESTADO_TALLES_CONFIRMADO = 'Confirmado';
const ESTADO_TALLES_CARGANDO = 'Cargando';
const ESTADO_LISTO_PARA_PRODUCCION = 'Listo para enviar a producción';
// Pedidos que aparecen en la planilla de banderas: con cruz si todavía no se mandaron a producción, con tic después
const ESTADOS_PEDIDO_BANDERAS = [ESTADO_LISTO_PARA_PRODUCCION, 'En producción', 'Listo para entregar', 'Entregado'];
const ESTADO_TALLES_NO_ACCEDIO = 'No accedió';

type ProductoPedidoNombre = { productos: { id: number } };

@Injectable()
export class GestionPedidosService
{
    private readonly logger = new Logger(GestionPedidosService.name);
    
    constructor(private colegios:ColegiosService, private grupos: GruposService,
        private pedidos:PedidosService, private productosPedido: ProductosPedidoService,
        private padres:PadreResponsableService, private alumnos:AlumnoResponsableService,
        private documentos:DocumentosService, private pagos:PagosService, private cuentaCorriente: CuentaCorrienteService,
        private cuotas: CuotasService, private sb: SupabaseService, private auditoriaService: AuditoriasService,
        private pedidosService: PedidosService, private agregadosGlobalesPedido: AgregadosGlobalesPedidoService,
        private beneficiosPedidoService: BeneficiosPedidoService, private notificacionesService: NotificacionesService){}

    async crearPedido(dto:CrearPedidoDTO)
    {
        const usuarioBase = this.normalizarUsuario(dto.colegioDTO.nombre, dto.grupoDTO.promo);

        const payload = { ...dto, usuario: usuarioBase, contrasena_hash: null };

        const { data, error } = await this.sb.supabase.rpc(
        'crear_pedido_completo',
        {
            payload: payload as unknown as Json
        }
        );

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        const resultado = data as unknown as { id_pedido: number; usuario: string };

        // Sin await: la venta responde enseguida. El .catch es obligatorio: si las notificaciones
        // fallan, el error queda en el log en vez de tirar abajo el backend (unhandled rejection).
        this.notificacionesService.procesarNuevaVenta(resultado.id_pedido)
            .catch(err => this.logger.error(`Notificaciones del pedido ${resultado.id_pedido}: ${err.message}`));

        return { id_pedido: resultado.id_pedido, usuario: resultado.usuario };
    }

    private normalizarUsuario(colegio: string, promo: number | null): string
    {
        return `${colegio}${promo ?? ''}`
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    }

    async obtenerPedidosVentas(rangoDesde: number, rangoHasta:number, busqueda?:string, promo?:number):Promise<PedidoResponseVentas[]>
    {
        let query = this.sb.supabase
        .from("pedidos")
        .select(`
            *,
            beneficios_pedido(id_beneficio, cantidad, beneficios(beneficio, id_producto)),
            grupos!inner(
                *,padres_responsables(nombre,apellido,principal),
                colegios(*)
            ),
            productos_pedidos(*),
            agregados_globales_pedido(*, agregados(agregado, precio, individual)),
            cuotas(id)
        `)
        .order("id", { ascending: false });

        if(busqueda)
        {
            query = query.or(`nombre.ilike.%${busqueda}%,localidad.ilike.%${busqueda}%`, { referencedTable: "grupos.colegios" });
        }
        if(promo)
        {
            query = query.eq("grupos.promo", promo);
        }

        const { data, error } = await query.range(rangoDesde, rangoHasta);

        if (error) 
        {
            throw new Error(error.message);
        }

        const pedidosVentas: PedidoResponseVentas[] = data.map(pedido => ({
            colegioDTO: pedido.grupos.colegios,
            grupoDTO: pedido.grupos,
            pedidoDTO: pedido,
            productosPedidoDTO: pedido.productos_pedidos,
            agregadosGlobalesDTO: pedido.agregados_globales_pedido.map((a: any): AgregadoGlobalPedidoResponseDTO => ({
                id: a.id,
                id_pedido: a.id_pedido,
                id_agregado: a.id_agregado,
                agregado: a.agregados?.agregado,
                precio: a.agregados?.precio,
                individual: a.agregados?.individual,
            })),
            nroCuotas: pedido.cuotas.length,
            padresResponsables: pedido.grupos.padres_responsables.filter(p => p.principal === true)
                .map(p => ({nombre:p.nombre!, apellido:p.apellido!})),
            beneficios: pedido.beneficios_pedido.map((b): BeneficioPedidoDTO => ({id_beneficio: b.id_beneficio,cantidad: b.cantidad,
                beneficio: b.beneficios?.beneficio ?? '',
                id_producto: b.beneficios?.id_producto ?? null,})),
            fechaVenta: pedido.grupos.created_at!
        }));

        return pedidosVentas;
    }

    async modificarPlanPedido(dto: ModificarPlanPedidoDTO)
    {
        const { data, error } = await this.sb.supabase.rpc(
            'modificar_plan_pedido',
            { payload: dto as unknown as Json }
        );

        if (error)
        {
            throw new BadRequestException(error.message);
        }
        return data;
    }

    async obtenerImporteTotalPedido(idPedido: number): Promise<number>
    {
        let importe = 0;

        const {data,error} = await this.sb.supabase
            .from('productos_pedidos')
            .select('valor_cuota, valor_senia, cantidad')
            .eq('id_pedido',idPedido)

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        const {data: dataAgregados, error: errorAgregados} = await this.sb.supabase
            .from('agregados_globales_pedido')
            .select('agregados(precio)')
            .eq('id_pedido',idPedido)

        if (errorAgregados)
        {
            throw new BadRequestException(errorAgregados.message);
        }

        const nroCuotas = (await this.cuotas.traerCuotasPorIdPedido(idPedido)).length;

        // valor_cuota/valor_senia en productos_pedidos son precios por unidad
        // (ver ProductosService.obtenerPreciosBeneficios): hay que multiplicar
        // por la cantidad del renglón, y el total de cuota se paga nroCuotas
        // veces. La seña, en cambio, se paga una sola vez.
        const totalCuotaPorUnidad = data.reduce((total, producto) => total + Number(producto.valor_cuota || 0) * Number(producto.cantidad || 0),0);
        const totalSenias = data.reduce((total, producto) => total + Number(producto.valor_senia || 0) * Number(producto.cantidad || 0),0);
        const totalAgregadosGlobales = dataAgregados.reduce((total, agregado) => total + Number(agregado.agregados?.precio || 0),0);
        importe = totalSenias + (totalCuotaPorUnidad + totalAgregadosGlobales) * nroCuotas;

        return importe;
    }

    async obtenerPresupuestoPedidosClientes(idGrupo: number):Promise<presupuestoPedidoClientesPage>
    {
        const pedido: PedidoDTOResponse = await this.pedidosService.obtenerPedidoGrupo(idGrupo);
        const productosPedido: ProductoPedidoResponseConNombreOriginalDTO[] = await this.productosPedido.traerProductosPedidoConNombreProducto(pedido.id);
        const agregadosGlobales: AgregadoGlobalPedidoResponseDTO[] = await this.agregadosGlobalesPedido.obtenerPorPedido(pedido.id);
        const cuotas: number = ((await this.cuotas.traerCuotasPorIdPedido(pedido.id)).length);
        const cantidadEgresados: number = agregadosGlobales.length ? (await this.grupos.traerCantidadEgresados(idGrupo)) ?? 0 : 0;
        const beneficios: BeneficioPedidoDTO[] = await this.beneficiosPedidoService.traerBeneficiosPedido(pedido.id);


        const presupuestoPedido: presupuestoPedidoClientesPage =
        {
            pedido: pedido,
            productosPedido: productosPedido,
            agregadosGlobales: agregadosGlobales,
            nroCuotas: cuotas,
            cantidadEgresados: cantidadEgresados,
            beneficios: beneficios
        };

        return presupuestoPedido;
    }

    async obtenerDatosPedidosControlTallesDisenio(mes:number, promo:number,busqueda?:string): Promise<ControlTallesDisenioDTO[]>
    {
        const primerDiaMes = new Date(promo, mes - 1, 1);
        const primerDiaMesSiguiente = new Date(primerDiaMes.getFullYear(),primerDiaMes.getMonth() + 1,1);

        let query = this.sb.supabase
        .from("pedidos")
        .select(`*,
            productos_pedidos(valor_senia,valor_cuota,
                productos(nombre)),
            cuotas(id, numero, estado),
            grupos!inner(id,
                created_at,
                promo,
                nivel,
                colegios!inner(nombre),
                padres_responsables(id, nombre, apellido, telefono, principal),
                alumnos_responsables(id, nombre, apellido, telefono, principal))
                ,pagos(monto, motivo),
            prendas_pedido(count)`)
        .eq("pagos.motivo", "Seña")
        .gte("grupos.created_at", primerDiaMes.toISOString())
        .lt("grupos.created_at", primerDiaMesSiguiente.toISOString())
        .order("id", { ascending: false });

        if(busqueda)
        {
            query = query.or(`nombre.ilike.%${busqueda}%`, { referencedTable: "grupos.colegios" });
        }

        const [{ data, error }, planTieneSenia] = await Promise.all([query, this.obtenerPlanesConSenia()]);

        if (error)
        {
            throw new Error(error.message);
        }

        const pedidos: ControlTallesDisenioDTO[] = data.map(pedido => ({
            id: pedido.id,
            nroCuotas: pedido.cuotas.length,
            estadoPrimerCuota: pedido.cuotas.find(c => c.numero === 1)?.estado ?? null,
            // Si el plan ya no está en el catálogo se compara el primer producto (como antes)
            senia: planTieneSenia.get(pedido.cuotas.length)
                ?? pedido.productos_pedidos[0]?.valor_senia != pedido.productos_pedidos[0]?.valor_cuota,
            seniaPaga:  pedido.pagos.reduce((total, pago) => total + pago.monto!, 0) >= pedido.productos_pedidos.reduce((total, producto) => total + producto.valor_senia, 0),
            promo: pedido.grupos.promo!,
            nombreColegio: pedido.grupos.colegios.nombre,
            alumnosResponsables: pedido.grupos.alumnos_responsables,
            padresResponsables: pedido.grupos.padres_responsables,
            productos: pedido.productos_pedidos.map(pp => pp.productos?.nombre).filter(Boolean).join(", "),
            estadoBoceto:pedido.estado_boceto,
            estadoTalles: this.calcularEstadoTalles(pedido.estado_talles, pedido.prendas_pedido[0]?.count ?? 0),
            fechaAprobacionBoceto: pedido.fecha_aprobacion_boceto ? new Date(pedido.fecha_aprobacion_boceto) : null,
            fechaAprobacionTalles: pedido.fecha_aprobacion_talles ? new Date(pedido.fecha_aprobacion_talles) : null,
            fechaVenta: new Date(pedido.grupos.created_at!),
            diseniadora: pedido.id_disenadora,
            idGrupo:pedido.grupos.id,
            nivel:pedido.grupos.nivel
        }));

        return pedidos;
    }

    // Que un plan tenga seña o sea de cuotas iguales depende solo de la cantidad de cuotas (igual para todos
    // los productos y cantidades). Se saca del catálogo y no del pedido, porque en el pedido la cuota incluye
    // los agregados individuales y un plan de cuotas iguales quedaría con seña != cuota. Mismo criterio que Ventas.
    private async obtenerPlanesConSenia(): Promise<Map<number, boolean>>
    {
        const { data, error } = await this.sb.supabase
        .from("precios_productos")
        .select("cuotas, valor_senia, valor_cuota");

        if (error)
        {
            throw new Error(error.message);
        }

        const planes = new Map<number, boolean>();
        for (const precio of data)
        {
            const conSenia = Number(precio.valor_senia) !== Number(precio.valor_cuota);
            planes.set(precio.cuotas, (planes.get(precio.cuotas) ?? false) || conSenia);
        }
        return planes;
    }

    // Estado de talles que ve Diseño: "Confirmado" lo pone el portal al firmar la planilla;
    // antes de eso depende de si el colegio ya guardó alguna prenda en la plataforma.
    private calcularEstadoTalles(estadoGuardado: string | null, cantidadPrendas: number): string
    {
        if (estadoGuardado === ESTADO_TALLES_CONFIRMADO) return ESTADO_TALLES_CONFIRMADO;
        return cantidadPrendas > 0 ? ESTADO_TALLES_CARGANDO : ESTADO_TALLES_NO_ACCEDIO;
    }

    async obtenerDatosProduccion(mesEntrega:number, añoEntrega: number, enviadosFabrica: boolean):Promise<ControlProduccionDTO[]>
    {
        // Strings 'YYYY-MM-DD': un Date se mandaría como "Thu Oct 01 2026 ..." y Postgres no lo entiende
        const mes = String(mesEntrega).padStart(2, '0');
        const desde = `${añoEntrega}-${mes}-01`;
        const hasta = mesEntrega === 12
            ? `${añoEntrega + 1}-01-01`
            : `${añoEntrega}-${String(mesEntrega + 1).padStart(2, '0')}-01`;

        let query = this.sb.supabase
        .from("pedidos")
        .select(`id,fecha_entrega_aproximada,nro_fabrica,estado_general,
            estado_camperas_buzos,estado_chombas_remeras,estado_pantalon,estado_bandera,
            beneficios_pedido(id_beneficio),agregados_globales_pedido(id_agregado),
            productos_pedidos(productos(id)),
            grupos!inner(
                contratos(firmado),
                colegios!inner(nombre, localidad, provincia))`)
        .order("id", { ascending: false });

        if(enviadosFabrica)
        {
            query = query.in("estado_general", ["En producción","Listo para entregar","Entregado"]);
            query = query.gte("fecha_entrega_aproximada", desde);
            query = query.lt("fecha_entrega_aproximada", hasta);
        }
        else
        {
            query = query.eq("estado_general","Listo para enviar a producción");
        }

        const { data, error } = await query;

        if (error)
        {
            throw new Error(error.message);
        }


        const pedidos: ControlProduccionDTO[] = 
            data.map((pedido) => ({
                idPedido:pedido.id,
                fechaEntrega: pedido.fecha_entrega_aproximada,
                nroFabrica: pedido.nro_fabrica,
                colegio: pedido.grupos.colegios.nombre,
                localidad: pedido.grupos.colegios.localidad,
                provincia: pedido.grupos.colegios.provincia,
                camperas_buzos: this.estadoPrenda(this.determinarPedidoIncluyePrenda(pedido.productos_pedidos, CAMPERAS_BUZOS), pedido.estado_camperas_buzos),
                chombas_remeras: this.estadoPrenda(this.determinarPedidoIncluyePrenda(pedido.productos_pedidos, CHOMBAS_REMERAS), pedido.estado_chombas_remeras),
                bandera: this.estadoPrenda(this.pedidos.tieneBandera(pedido.beneficios_pedido,pedido.agregados_globales_pedido), pedido.estado_bandera),
                pantalon: this.estadoPrenda(this.determinarPedidoIncluyePrenda(pedido.productos_pedidos, PANTALONES), pedido.estado_pantalon),
                estado_pedido: pedido.estado_general!,
                // La fila de contratos se crea/actualiza cuando firman todos los padres (marcarContratoFirmado)
                contratoFirmado: pedido.grupos.contratos.some(c => c.firmado === true),
                }));

        return pedidos;
    }

    private determinarPedidoIncluyePrenda(productosPedidos: ProductoPedidoNombre[], ids: number[]): boolean
    {
        return productosPedidos.some(p => ids.includes(p.productos.id));
    }

    private estadoPrenda(incluye: boolean, estadoGuardado: string): EstadoPrenda
    {
        if (!incluye) return 'No lleva';
        return estadoGuardado === 'Ok' ? 'Ok' : 'Pendiente';
    }

    // Asigna nro de fábrica, fecha de entrega y vencimiento de la última cuota en una sola transacción (RPC),
    // y después avisa por wpp que el contrato esta disponible.
    async enviarPedidoFabrica(idPedido: number, mesEntrega: number, anioEntrega: number): Promise<{ nroFabrica: number; whatsappEnviado: boolean }>
    {
        const { data, error } = await this.sb.supabase.rpc('enviar_pedido_a_fabrica', {
            p_id_pedido: idPedido,
            p_mes: mesEntrega,
            p_anio: anioEntrega,
        });

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        // Si falla el WhatsApp el pedido ya quedo enviado; solo se informa (la notificacion queda en 'error')
        let whatsappEnviado = true;
        try
        {
            await this.notificacionesService.enviarMensajeContrato(idPedido);
        }
        catch (e)
        {
            whatsappEnviado = false;
            Logger.error(`No se pudo enviar el WhatsApp de contrato del pedido ${idPedido}`, e);
        }

        return { nroFabrica: data, whatsappEnviado };
    }

    async obtenerPedidosControlBandera(mes: number, anio:number):Promise<ControlBanderasDTO[]>
    {
        // Strings 'YYYY-MM-DD' (igual que en obtenerDatosProduccion): toISOString pasa a UTC y corre la fecha
        const mesTexto = String(mes).padStart(2, '0');
        const desde = `${anio}-${mesTexto}-01`;
        const hasta = mes === 12
            ? `${anio + 1}-01-01`
            : `${anio}-${String(mes + 1).padStart(2, '0')}-01`;

        const {data,error} = await this.sb.supabase
        .from("pedidos")
        .select(`id,estado_general,fecha_entrega_aproximada,
            banderas_pedido!inner(id, estado_boceto, motivo_perdida_beneficio, origen, id_disenadora,
                usuarios(nombre)),
            grupos!inner(nivel, colegios!inner(nombre),
                padres_responsables(telefono, principal),
                alumnos_responsables(telefono, principal))`)
        .in("estado_general", ESTADOS_PEDIDO_BANDERAS)
        .gte("fecha_entrega_aproximada", desde)
        .lt("fecha_entrega_aproximada", hasta)
        .order("fecha_entrega_aproximada", { ascending: true })
        .order("id", { ascending: true })
        .order("id", { ascending: true, referencedTable: "banderas_pedido" });

        if (error)
        {
            throw new Error(error.message);
        }

        const banderas: ControlBanderasDTO[] = data.map(pedido => {
            // Secundaria: alumno responsable principal. Resto de niveles: padre responsable principal
            const responsables = pedido.grupos.nivel == "Secundaria"
                ? pedido.grupos.alumnos_responsables
                : pedido.grupos.padres_responsables;

            return {
                idPedido: pedido.id,
                colegio: pedido.grupos.colegios.nombre,
                fechaEntrega: pedido.fecha_entrega_aproximada!,
                contacto: responsables.find(r => r.principal)?.telefono ?? null,
                banderas: pedido.banderas_pedido.map(b => ({
                    id: b.id,
                    origen: b.origen as OrigenBandera,
                    idDisenadora: b.id_disenadora,
                    disenadora: b.usuarios?.nombre ?? null,
                    motivoPerdidaBeneficio: b.motivo_perdida_beneficio,
                    estadoBoceto: b.estado_boceto as EstadoBocetoBandera,
                })),
                enviadaProduccion: pedido.estado_general !== ESTADO_LISTO_PARA_PRODUCCION,
            };
        });

        return banderas;
    }

    async modificarBandera(idBandera: number, dto: ModificarBanderaDTO)
    {
        const cambios: { estado_boceto?: string; id_disenadora?: number | null; motivo_perdida_beneficio?: string | null } = {};

        if (dto.estadoBoceto !== undefined) cambios.estado_boceto = dto.estadoBoceto;
        if (dto.idDiseniadora !== undefined) cambios.id_disenadora = dto.idDiseniadora;
        // String vacío = ya no pierde el beneficio
        if (dto.motivoPerdidaBeneficio !== undefined) cambios.motivo_perdida_beneficio = dto.motivoPerdidaBeneficio?.trim() || null;

        if (Object.keys(cambios).length === 0)
        {
            throw new BadRequestException('No hay cambios para guardar.');
        }

        const { data, error } = await this.sb.supabase
        .from("banderas_pedido")
        .update(cambios)
        .eq("id", idBandera)
        .select("id");

        // El check de la tabla rechaza motivo de pérdida en banderas compradas
        if (error)
        {
            throw new BadRequestException(error.message);
        }

        if (data.length === 0)
        {
            throw new BadRequestException('La bandera no existe.');
        }
    }
}
