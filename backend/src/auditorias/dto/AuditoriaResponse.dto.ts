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

export type DatoAuditoria = PresupuestoAuditoria | BeneficioAuditoria[] | DisenioAuditoria | PrendaAuditoria[] | null;

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
