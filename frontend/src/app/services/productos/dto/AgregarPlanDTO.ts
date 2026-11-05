export class AgregarPlanDTO
{
    cuotas!:number;
    senia!:boolean;

    //Campera|Buzo
    precioCuotaCampera20a25!:number;
    precioCuotaCampera26a40!:number;
    precioCuotaCampera41a55!:number;
        
    precioSeniaCampera20a25?:number;
    precioSeniaCampera26a40?:number;
    precioSeniaCampera41a55?:number;

    //Chomba|Remera
    precioCuotaChomba20a55!:number;
    precioSeniaChomba20a55?:number;

    //Campera universitaria
    precioCuotaCamperaUniversitaria20a25!:number;
    precioCuotaCamperaUniversitaria26a40!:number;
    precioCuotaCamperaUniversitaria41a55!:number;
        
    precioSeniaCamperaUniversitaria20a25?:number;
    precioSeniaCamperaUniversitaria26a40?:number;
    precioSeniaCamperaUniversitaria41a55?:number;

    //Joggin
    precioCuotaJoggin20a25!:number;
    precioCuotaJoggin26a40!:number;
    precioCuotaJoggin41a55!:number;
        
    precioSeniaJoggin20a25?:number;
    precioSeniaJoggin26a40?:number;
    precioSeniaJoggin41a55?:number;

    //Combo Campera|Buzo y Chomba|Remera
    precioCuotaCombo20a25!:number;
    precioCuotaCombo26a40!:number;
    precioCuotaCombo41a55!:number;
        
    precioSeniaCombo20a25?:number;
    precioSeniaCombo26a40?:number;
    precioSeniaCombo41a55?:number;
}