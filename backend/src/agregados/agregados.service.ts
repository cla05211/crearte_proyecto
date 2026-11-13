import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { AgregadoResponseDTO } from './dto/AgregadoResponse.dto';
import { ModificarAgregadoPrecioDTO } from './dto/ModificarAgregadoPrecio.dto';

@Injectable()
export class AgregadosService 
{
    constructor(private sb: SupabaseService){}

    async obtenerAgregados(): Promise<AgregadoResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('agregados')
            .select('id, agregado, precio, individual')
            .order('individual', { ascending: false })
            .order('agregado', { ascending: true });

        if (error)
        {
            throw new BadRequestException(error.message);
        }

        return data.map(a => ({
            id: a.id,
            agregado: a.agregado ?? '',
            precio: Number(a.precio ?? 0),
            individual: a.individual ?? false,
        }));
    }

    async modificarPrecios(precios: ModificarAgregadoPrecioDTO[]): Promise<number>
    {
        if (!Array.isArray(precios) || precios.length === 0)
        {
            throw new BadRequestException('No hay precios para modificar');
        }

        const invalido = precios.find(p => !Number.isInteger(Number(p.id)) || !(Number(p.precio) > 0));
        if (invalido)
        {
            throw new BadRequestException('Todos los precios tienen que ser mayores a cero');
        }

        const resultados = await Promise.all(precios.map(p =>
            this.sb.supabase
                .from('agregados')
                .update({ precio: Number(p.precio) })
                .eq('id', Number(p.id))
                .select('id')
        ));

        const conError = resultados.find(r => r.error);
        if (conError)
        {
            throw new BadRequestException(conError.error!.message);
        }

        const noEncontrados = precios.filter((_, i) => !resultados[i].data?.length).map(p => p.id);
        if (noEncontrados.length)
        {
            throw new BadRequestException(`No existe el agregado ${noEncontrados.join(', ')}`);
        }

        return precios.length;
    }
}
