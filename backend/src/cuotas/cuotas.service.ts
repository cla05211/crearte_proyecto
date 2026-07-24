import { Injectable } from '@nestjs/common';
import { CuotaDTO } from './dto/cuota.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { CuotaInicioVentaDTO } from './dto/cuotaInicioVenta.dto';

@Injectable()
export class CuotasService 
{
    constructor(private sb: SupabaseService){}

    async crearCuotas(primerCuota: CuotaInicioVentaDTO, nroCuotas: number)
    {
        const cuotas = await this.calcularCuotas(primerCuota,nroCuotas)

        console.log(cuotas);

        const {data,error} = await this.sb.supabase
        .from('cuotas')
        .insert(cuotas)

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }

    async calcularCuotas(primerCuota: CuotaInicioVentaDTO, nroCuotas: number): Promise<CuotaInicioVentaDTO[]>
    {
        var cuotas: CuotaInicioVentaDTO[] = [primerCuota];

        for (let index = 1; index < nroCuotas; index++) 
        {
            var nuevaCuota: CuotaInicioVentaDTO = {...primerCuota, fecha_vencimiento: new Date(primerCuota.fecha_vencimiento)};
            nuevaCuota.numero = index + 2;  
            nuevaCuota.fecha_vencimiento = this.acomodarFecha(primerCuota.fecha_vencimiento, index);

            cuotas.push(nuevaCuota);
        }

        return cuotas;
    }

    acomodarFecha(fechaOriginal: Date, mesesSumados: number): Date
    {
        const fecha = new Date(fechaOriginal);
        const diaOriginal = fecha.getDate();

        fecha.setDate(1);
        fecha.setMonth(fecha.getMonth() + mesesSumados);

        const ultimoDia = new Date(
            fecha.getFullYear(),
            fecha.getMonth() + 1,
            0
        ).getDate();

        fecha.setDate(Math.min(diaOriginal, ultimoDia));
    
        return fecha
    }
}
