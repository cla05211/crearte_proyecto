import { TipoAuditoria } from './insertarAuditoria.dto';

// --- Fotos (JSON) que se guardan en dato_anterior / dato_nuevo ---

export interface ProductoPresupuestoAuditoria
{
    nombre: string;
    cantidad: number;
    valorSenia: number;
    valorCuota: number;
}

export interface PresupuestoAuditoria
{
    productos: ProductoPresupuestoAuditoria[];
    agregados: string[];
    nroCuotas: number;
    senia: number;
    totalCuotas: number;
    total: number;
}

export interface BeneficioAuditoria
{
    beneficio: string;
    cantidad: number;
}

export interface ArchivoAuditoria
{
    bucket: 'disenios' | 'imagenes';
    ruta: string;
}

export interface DisenioAuditoria
{
    tipo: string;
    archivo: ArchivoAuditoria;
}

export interface PrendaAuditoria
{
    producto: string;
    talle: string;
    inscripcion: string | null;
}

// Cancelación: en dato_anterior va { estado } (cómo estaba el pedido al cancelarlo)
// y en dato_nuevo el motivo y si se devolvió la plata
export interface EstadoPedidoAuditoria
{
    estado: string | null;
}

export interface CancelacionAuditoria
{
    motivo: string;
    devolucionPlata: boolean;
    banco: string | null;
}

export type DatoAuditoria = PresupuestoAuditoria | BeneficioAuditoria[] | DisenioAuditoria | PrendaAuditoria[]
    | EstadoPedidoAuditoria | CancelacionAuditoria | null;

// --- Cancelación del pedido (se muestra en la ficha del cliente) ---

export interface CancelacionPedidoDTO
{
    fecha: string;
    autor: string;
    devolucionPlata: boolean | null;
    banco: string | null;
}

// --- Respuesta de la página de auditoría ---

export interface AuditoriaRegistroDTO
{
    id: number;
    fecha: string;
    tipo: TipoAuditoria;
    accion: string;
    idPedido: number;
    colegio: string;
    promo: number | null;
    nroFabrica: number | null;
    autor: string;
    autorEsCliente: boolean;
    despuesProduccion: boolean;
    datoAnterior: DatoAuditoria;
    datoNuevo: DatoAuditoria;
}

export interface AuditoriaPaginaDTO
{
    registros: AuditoriaRegistroDTO[];
    total: number;
}

export interface FiltrosAuditoria
{
    rangoDesde: number;
    rangoHasta: number;
    tipo?: TipoAuditoria;
    busqueda?: string;
    idPedido?: number;
}
