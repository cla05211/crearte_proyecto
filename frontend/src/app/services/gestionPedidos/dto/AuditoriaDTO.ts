export type TipoAuditoria = 'presupuesto' | 'beneficios' | 'disenio' | 'talles';

// --- Fotos (JSON) de cómo estaba y cómo quedó el pedido ---

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

export interface DisenioAuditoria
{
    tipo: string;
    archivo: { bucket: string; ruta: string };
}

export interface PrendaAuditoria
{
    producto: string;
    talle: string;
    inscripcion: string | null;
}

export type DatoAuditoria = PresupuestoAuditoria | BeneficioAuditoria[] | DisenioAuditoria | PrendaAuditoria[] | null;

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
    tipo?: TipoAuditoria;
    busqueda?: string;
    idPedido?: number;
}
