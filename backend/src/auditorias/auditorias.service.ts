import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ACCIONES_AUDITORIA, insertarAuditoriaDTO, TABLAS_AUDITORIA, TipoAuditoria } from './dto/insertarAuditoria.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { calcularSeniaTotal } from 'src/pagos/estadoSeña.util';
import {
    AuditoriaPaginaDTO, AuditoriaRegistroDTO, BeneficioAuditoria, DatoAuditoria, DisenioAuditoria,
    FiltrosAuditoria, PrendaAuditoria, PresupuestoAuditoria,
} from './dto/AuditoriaResponse.dto';

// Un cambio cuenta como "después de producción" si el pedido ya se mandó a fábrica
const ESTADOS_EN_PRODUCCION = ['En producción', 'Listo para entregar', 'Entregado'];

// Talles y diseño solo se auditan con el pedido ya en producción (antes se pueden cambiar libremente).
// Presupuesto y beneficios se auditan siempre.
const TIPOS_SOLO_EN_PRODUCCION: TipoAuditoria[] = ['talles', 'disenio'];

@Injectable()
export class AuditoriasService 
{
    private readonly logger = new Logger(AuditoriasService.name);

    constructor(private sb: SupabaseService){}

    // Nunca tira error: el cambio auditado ya se guardó y no tiene que fallar por la auditoría.
    // Si no se puede registrar queda en el log.
    async registrar(dto: insertarAuditoriaDTO): Promise<void>
    {
        try
        {
            const anterior = dto.datoAnterior === undefined ? null : JSON.stringify(dto.datoAnterior);
            const nuevo = dto.datoNuevo === undefined ? null : JSON.stringify(dto.datoNuevo);

            if (dto.omitirSiNoCambia && anterior === nuevo) return;

            const enProduccion = await this.estaEnProduccion(dto.idPedido);
            if (!enProduccion && TIPOS_SOLO_EN_PRODUCCION.includes(dto.tipo)) return;

            const { error } = await this.sb.supabase
            .from('auditoria')
            .insert({
                tabla: TABLAS_AUDITORIA[dto.tipo],
                accion: dto.accion,
                id_pedido: dto.idPedido,
                usuario: dto.autor.idUsuario ?? null,
                id_cliente: dto.autor.idCliente ?? null,
                registro_id_modificado: dto.registroId ?? dto.idPedido,
                dato_anterior: anterior,
                dato_nuevo: nuevo,
                despues_produccion: enProduccion,
            });

            if (error) 
            {
                throw new Error(error.message);
            }
        }
        catch (e)
        {
            this.logger.error(`No se pudo registrar la auditoría "${dto.accion}" del pedido ${dto.idPedido}: ${(e as Error).message}`);
        }
    }

    private async estaEnProduccion(idPedido: number): Promise<boolean>
    {
        const { data, error } = await this.sb.supabase
        .from('pedidos')
        .select('estado_general, nro_fabrica')
        .eq('id', idPedido)
        .single();

        if (error) 
        {
            throw new Error(error.message);
        }

        return data.nro_fabrica !== null || ESTADOS_EN_PRODUCCION.includes(data.estado_general ?? '');
    }

    //--- Fotos de cómo está el pedido (se guardan antes y después del cambio) ---
    // Si la foto falla se devuelve null: el cambio se hace igual y la auditoría queda sin ese dato.

    async fotoPresupuesto(idPedido: number): Promise<PresupuestoAuditoria | null>
    {
        try
        {
            const { data, error } = await this.sb.supabase
            .from('pedidos')
            .select(`senia_total,
                productos_pedidos(id, descripcion, cantidad, valor_senia, valor_cuota, productos(nombre)),
                cuotas(importe),
                agregados_globales_pedido(agregados(agregado))`)
            .eq('id', idPedido)
            .single();

            if (error) 
            {
                throw new Error(error.message);
            }

            const productos = [...data.productos_pedidos]
                .sort((a, b) => a.id - b.id)
                .map(p => ({
                    nombre: p.descripcion || p.productos?.nombre || 'Producto',
                    cantidad: Number(p.cantidad),
                    valorSenia: Number(p.valor_senia),
                    valorCuota: Number(p.valor_cuota),
                }));

            const senia = calcularSeniaTotal(data.senia_total, data.productos_pedidos);
            const totalCuotas = this.redondear(data.cuotas.reduce((total, c) => total + Number(c.importe || 0), 0));

            return {
                productos,
                agregados: data.agregados_globales_pedido.map(a => a.agregados?.agregado ?? 'Agregado').sort(),
                nroCuotas: data.cuotas.length,
                senia: this.redondear(senia),
                totalCuotas,
                total: this.redondear(senia + totalCuotas),
            };
        }
        catch (e)
        {
            this.logger.error(`No se pudo leer el presupuesto del pedido ${idPedido} para auditoría: ${(e as Error).message}`);
            return null;
        }
    }

    async fotoBeneficios(idPedido: number): Promise<BeneficioAuditoria[] | null>
    {
        try
        {
            const { data, error } = await this.sb.supabase
            .from('beneficios_pedido')
            .select('cantidad, beneficios(beneficio)')
            .eq('id_pedido', idPedido);

            if (error) 
            {
                throw new Error(error.message);
            }

            return data
                .map(b => ({ beneficio: b.beneficios?.beneficio ?? 'Beneficio', cantidad: Number(b.cantidad ?? 0) }))
                .sort((a, b) => a.beneficio.localeCompare(b.beneficio));
        }
        catch (e)
        {
            this.logger.error(`No se pudieron leer los beneficios del pedido ${idPedido} para auditoría: ${(e as Error).message}`);
            return null;
        }
    }

    async fotoTalles(idPedido: number): Promise<PrendaAuditoria[] | null>
    {
        try
        {
            const { data, error } = await this.sb.supabase
            .from('prendas_pedido')
            .select('talle, inscripcion, productos(nombre)')
            .eq('id_pedido', idPedido);

            if (error) 
            {
                throw new Error(error.message);
            }

            return data
                .map(p => ({ producto: p.productos?.nombre ?? 'Prenda', talle: p.talle ?? '-', inscripcion: p.inscripcion ?? null }))
                .sort((a, b) => a.producto.localeCompare(b.producto) || a.talle.localeCompare(b.talle)
                    || (a.inscripcion ?? '').localeCompare(b.inscripcion ?? ''));
        }
        catch (e)
        {
            this.logger.error(`No se pudieron leer los talles del pedido ${idPedido} para auditoría: ${(e as Error).message}`);
            return null;
        }
    }

    // Talles tal como estaban cuando administración reabrió la planilla (se guardó en la auditoría
    // de "Edición de talles habilitada"). Sirve de "antes" cuando el cliente termina de editar.
    // Solo vale si es la última acción de talles: si la planilla se reabrió antes de producción no hay
    // registro de esa apertura, y no hay que tomar la foto de una edición anterior que ya se cerró.
    async fotoTallesAlHabilitarEdicion(idPedido: number): Promise<PrendaAuditoria[] | null>
    {
        const { data, error } = await this.sb.supabase
        .from('auditoria')
        .select('accion, dato_anterior')
        .eq('id_pedido', idPedido)
        .eq('tabla', TABLAS_AUDITORIA.talles)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

        if (error || data?.accion !== ACCIONES_AUDITORIA.EDICION_TALLES_HABILITADA || !data.dato_anterior)
        {
            return null;
        }

        return this.parsear(data.dato_anterior) as PrendaAuditoria[] | null;
    }

    //--- Página de auditoría ---

    async listar(filtros: FiltrosAuditoria): Promise<AuditoriaPaginaDTO>
    {
        let query = this.sb.supabase
        .from('auditoria')
        .select(`id, created_at, tabla, accion, dato_anterior, dato_nuevo, despues_produccion, id_pedido,
            usuarios(nombre, apellido),
            clientes(usuario),
            pedidos!inner(nro_fabrica, grupos!inner(promo, colegios!inner(nombre)))`, { count: 'exact' })
        .in('tabla', Object.values(TABLAS_AUDITORIA))
        // Talles y diseño solo interesan con el pedido en producción
        .or(`despues_produccion.eq.true,tabla.not.in.(${TIPOS_SOLO_EN_PRODUCCION.map(t => TABLAS_AUDITORIA[t]).join(',')})`)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });

        if (filtros.tipo)
        {
            query = query.eq('tabla', TABLAS_AUDITORIA[filtros.tipo]);
        }
        if (filtros.idPedido)
        {
            query = query.eq('id_pedido', filtros.idPedido);
        }
        if (filtros.busqueda)
        {
            query = query.ilike('pedidos.grupos.colegios.nombre', `%${filtros.busqueda}%`);
        }

        const { data, error, count } = await query.range(filtros.rangoDesde, filtros.rangoHasta);

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        const registros: AuditoriaRegistroDTO[] = data.map(fila => ({
            id: fila.id,
            fecha: fila.created_at,
            tipo: this.tipoDeTabla(fila.tabla),
            accion: fila.accion,
            idPedido: fila.id_pedido!,
            colegio: fila.pedidos.grupos.colegios.nombre,
            promo: fila.pedidos.grupos.promo,
            nroFabrica: fila.pedidos.nro_fabrica,
            autor: fila.usuarios
                ? `${fila.usuarios.nombre ?? ''} ${fila.usuarios.apellido ?? ''}`.trim() || 'Usuario'
                : fila.clientes ? `Cliente (${fila.clientes.usuario.trim()})` : 'Cliente',
            autorEsCliente: !fila.usuarios,
            despuesProduccion: fila.despues_produccion,
            datoAnterior: this.parsear(fila.dato_anterior),
            datoNuevo: this.parsear(fila.dato_nuevo),
        }));

        return { registros, total: count ?? registros.length };
    }

    // URL para bajar la versión anterior o nueva de un boceto/firmado auditado.
    // Por eso al reemplazar un diseño ya no se borra el archivo viejo de Storage.
    async crearUrlArchivo(idAuditoria: number, version: 'anterior' | 'nuevo'): Promise<{ url: string }>
    {
        const { data, error } = await this.sb.supabase
        .from('auditoria')
        .select('tabla, dato_anterior, dato_nuevo')
        .eq('id', idAuditoria)
        .single();

        if (error || !data || data.tabla !== TABLAS_AUDITORIA.disenio)
        {
            throw new NotFoundException('No se encontró el registro de diseño.');
        }

        const disenio = this.parsear(version === 'anterior' ? data.dato_anterior : data.dato_nuevo) as DisenioAuditoria | null;

        if (!disenio?.archivo?.ruta)
        {
            throw new NotFoundException('Este registro no tiene esa versión del archivo.');
        }

        const extension = disenio.archivo.ruta.split('.').pop() || 'pdf';
        const nombre = `${disenio.tipo.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'disenio'} (${version}).${extension}`;

        const { data: firmada, error: errorUrl } = await this.sb.supabase.storage
        .from(disenio.archivo.bucket)
        .createSignedUrl(disenio.archivo.ruta, 60, { download: nombre });

        if (errorUrl)
        {
            throw new NotFoundException('El archivo ya no está disponible en Storage.');
        }

        return { url: firmada.signedUrl };
    }

    private tipoDeTabla(tabla: string): TipoAuditoria
    {
        const tipo = (Object.keys(TABLAS_AUDITORIA) as TipoAuditoria[]).find(t => TABLAS_AUDITORIA[t] === tabla);
        return tipo ?? 'presupuesto';
    }

    private parsear(dato: string | null): DatoAuditoria
    {
        if (!dato) return null;

        try
        {
            return JSON.parse(dato) as DatoAuditoria;
        }
        catch
        {
            return null;
        }
    }

    private redondear(valor: number): number
    {
        return Math.round(valor * 100) / 100;
    }
}
