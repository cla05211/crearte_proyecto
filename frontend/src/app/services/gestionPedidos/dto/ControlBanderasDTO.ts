export const ESTADOS_BOCETO_BANDERA = ['Pendiente de hablar', 'Sin respuesta', 'Diseñada', 'Confirmada'] as const;
export type EstadoBocetoBandera = (typeof ESTADOS_BOCETO_BANDERA)[number];
export type OrigenBandera = 'Beneficio' | 'Comprada';

export interface BanderaDTO
{
    id: number;
    origen: OrigenBandera;
    disenadora: string | null;
    idDisenadora: number | null;
    motivoPerdidaBeneficio: string | null;
    estadoBoceto: EstadoBocetoBandera;
    // La marcan a mano cuando la mandan a fábrica (no tiene que ver con el estado del pedido)
    enviadaProduccion: boolean;
}

// Un pedido (colegio) con todas sus banderas
export interface ControlBanderasDTO
{
    idPedido: number;
    colegio: string;
    fechaEntrega: string;
    contacto: string | null;
    banderas: BanderaDTO[];
}

// PATCH de una bandera: solo se actualizan los campos que vienen
export interface ModificarBanderaDTO
{
    estadoBoceto?: EstadoBocetoBandera;
    idDiseniadora?: number | null;
    motivoPerdidaBeneficio?: string | null;
    enviadaProduccion?: boolean;
}
