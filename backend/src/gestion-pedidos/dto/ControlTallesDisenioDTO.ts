export class ContactoResponsableDTO
{
    id!: number;
    nombre!: string | null;
    apellido!: string | null;
    telefono!: string | null;
    principal!: boolean;
}

export class ControlTallesDisenioDTO
{
    id!: number;
    nroCuotas!: number;
    senia!: boolean;
    seniaPaga!: boolean | null;
    estadoPrimerCuota!: string | null;
    promo!: number;
    nombreColegio!: string;
    idGrupo!: number;
    nivel!: string | null;
    alumnosResponsables!: ContactoResponsableDTO[];
    padresResponsables!: ContactoResponsableDTO[];
    productos!: string;
    estadoBoceto!: string | null;
    estadoTalles!: string | null;
    fechaAprobacionBoceto!: Date | null;
    fechaAprobacionTalles!: Date | null;
    fechaVenta!: Date;
    diseniadora!: number | null;
}