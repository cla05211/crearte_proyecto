export interface colegioDeudorDTO
{
    idGrupo: number;
    nroFabrica: number|null;
    colegio: string;
    nroCuotasAdeudadas: number;
    montoAdeudado: number;
    padreResponsable: string;
    contacto: string;
    diasAtraso:number;
}