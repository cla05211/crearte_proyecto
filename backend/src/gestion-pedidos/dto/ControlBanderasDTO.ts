export const ESTADOS_BOCETO_BANDERA = ['Pendiente de hablar', 'Sin respuesta', 'Diseñada', 'Confirmada'] as const;
export type EstadoBocetoBandera = (typeof ESTADOS_BOCETO_BANDERA)[number];
export type OrigenBandera = 'Beneficio' | 'Comprada';

export class ControlBanderasDTO
{
    idPedido!: number;
    colegio!: string;
    fechaEntrega!: string;
    contacto!: string | null;
    banderas!: BanderaDTO[];
}

export class BanderaDTO
{
    id!: number;
    origen!: OrigenBandera;
    disenadora!: string | null;
    idDisenadora!: number | null;
    motivoPerdidaBeneficio!: string |null;
    estadoBoceto!: EstadoBocetoBandera;
    enviadaProduccion!: boolean;
}

export class ModificarBanderaDTO
{
    estadoBoceto?: EstadoBocetoBandera;
    idDiseniadora?: number | null;
    motivoPerdidaBeneficio?: string | null;
    enviadaProduccion?: boolean;
}
