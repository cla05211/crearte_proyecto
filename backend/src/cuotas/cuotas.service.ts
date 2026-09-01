import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CuotaDTO } from './dto/cuota.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { CuotaResponseDTO } from './dto/cuotaResponse.dto';
import { CuotaInicioVentaDTO } from './dto/cuotaInicioVenta.dto';
import { ModificarImporteCuotasDTO } from './dto/ModificarImporteCuotas';
import { crearCuotasDTO } from './dto/crearCuotas.dto';
import { PagarCuotaDTO } from './dto/PagarCuota.dto';
import { ModificarImporteCuotaDTO } from './dto/ModificarImporteCuota';

@Injectable()
export class CuotasService 
{
    constructor(private sb: SupabaseService){}

    async crearCuotas(dto: crearCuotasDTO)
    {
        const cuotas = await this.calcularCuotas(dto.primerCuota,dto.nroCuotas)

        const cuotasInsert = cuotas.map(({ fecha_vencimiento, ...resto }) => ({
            ...resto,
            fecha_vencimiento: fecha_vencimiento.toISOString().slice(0, 10),
        }));

        const {data,error} = await this.sb.supabase
        .from('cuotas')
        .insert(cuotasInsert)

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

    async traerCuotasPendientesPorIdPedido(idPedido: number): Promise<CuotaResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('cuotas')
            .select(`*`)
            .eq('id_pedido', idPedido)
            .in('estado', ['Pendiente', 'Parcial', 'Adeudada'])
            .order('numero', { ascending: true })

        if (error) 
        {
            throw new Error(error.message);
        }        

        return data as CuotaResponseDTO[];
    }

    async traerCuotasPorIdPedido(idPedido: number): Promise<CuotaResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('cuotas')
            .select(`*`)
            .eq('id_pedido', idPedido)
            .order('fecha_vencimiento', { ascending: true });

        if (error) 
        {
            throw new Error(error.message);
        }        

        return data as CuotaResponseDTO[];
    }

    async modificarImporteCuotasPendientesPedido(dto: ModificarImporteCuotasDTO)
    {
        const { data, error } = await this.sb.supabase
        .from("cuotas")
        .update({ 'importe': dto.importe })
        .eq("id_pedido", dto.id_pedido)
        .eq("estado", "Pendiente")
        .select()

        if (error) 
        {
            throw new Error(error.message);
        }

        return data;
    }

    async modificarImporteUnaCuotaPedido(dto: ModificarImporteCuotaDTO)
    {
        const { data, error } = await this.sb.supabase
        .from("cuotas")
        .update({ 'importe': dto.importe})
        .eq("id_pedido", dto.id_pedido)
        .eq("numero", dto.numero)
        .select()

        if (error) 
        {
            throw new Error(error.message);
        }

        return data;
    }

    async pagarCuotaPuntual(dto: PagarCuotaDTO)
    {
        const { data, error } = await this.sb.supabase
        .from("cuotas")
        .update({ 'estado': dto.nuevoEstado, 'monto_cubierto': dto.importe})
        .eq("id_pedido", dto.id_pedido)
        .eq("numero", dto.numero)

        if (error) 
        {
            throw new Error(error.message);
        }

        return data;
    }

    async cubrirCuotas(pago: number, idPedido: number)
    {
        const pendientes: CuotaResponseDTO[] = await this.traerCuotasPendientesPorIdPedido(idPedido);
        let restante = pago;

        for (const cuota of pendientes)
        {
            if (restante <= 0) break;

            const yaCubierto = cuota.monto_cubierto ?? 0;
            const faltaCuota = cuota.importe! - yaCubierto;

            if (restante >= faltaCuota)
            {
                await this.pagarCuotaPuntual({
                    id_pedido: idPedido,
                    numero: cuota.numero!,
                    importe: cuota.importe!,
                    nuevoEstado: "Pagado",
                });
                restante -= faltaCuota;
            }
            else
            {
                await this.pagarCuotaPuntual({
                    id_pedido: idPedido,
                    numero: cuota.numero!,
                    importe: yaCubierto + restante,
                    nuevoEstado: "Parcial",
                });
                restante = 0;
            }
        }
    }

    async eliminarCuotasPedido(idPedido: number)
    {
        const { data, error } = await this.sb.supabase
        .from('cuotas')
        .delete()
        .eq('id_pedido', idPedido)

        if (error) 
        {
            throw new InternalServerErrorException(`No se pudieron eliminar las cuotas. ${error.message}`);
        }

        return data;          
    }
}
