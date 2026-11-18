export interface colegioDeudorDTO
{
    idGrupo: number;
    idPedido: number;
    estadoGeneral: string | null;
    nroFabrica: number|null;
    colegio: string;
    nroCuotasAdeudadas: number;
    montoAdeudado: number;
    deudaSenia: number;
    seniaEsPrimeraCuota: boolean;
    padreResponsable: string;
    contacto: string;
    diasAtraso:number;
}