export class EstadisticasProduccionDTO
{
    fechaVenta!: string;       
    enviadoProduccion!: boolean;
    prendas!: 
    {
        buzos: number;
        camperas: number;
        remeras: number;
        chombas: number;
        pantalones: number;
    };
    banderasProduccion!: number;
    banderasBeneficio!: number;
}