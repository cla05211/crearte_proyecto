export interface DetalleCuotaPago
{
    tipo: 'senia' | 'completa' | 'parcial' | 'excedente';
    numero?: number;
    monto?: number;
}
