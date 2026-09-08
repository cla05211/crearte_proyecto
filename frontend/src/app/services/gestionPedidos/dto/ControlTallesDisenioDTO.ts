export class ControlTallesDisenioDTO
{
    id!: number;
    nroCuotas!: number;
    senia!:boolean;
    promo!:number;
    nombreColegio!: string;
    nrosContactoPadres!: string[] | null;
    nrosContactoAlumnos!: string[] | null;
    telefono_principal!: string | null;
    productos!:string;
    estadoBoceto!: string | null
    estadoTalles!: string | null
    fechaAprobacionBoceto!: Date|null;
    fechaAprobacionTalles!: Date|null;    
    fechaVenta!: Date;
    diseniadora!: number |null; 
}