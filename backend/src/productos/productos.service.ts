import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { ProductoDBDTO} from './dto/Producto.dto';
import { AgregadoDBDTO } from './dto/Agregado.dto';
import { ProductoPostDTO } from './dto/ProductoPOST.dto';
import { AgregadoPostDTO } from './dto/AgregadoPost.dto';
import { InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class ProductosService 
{
    constructor(private sb: SupabaseService){}

    async obtenerProductos():Promise<ProductoDBDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('productos')
            .select('*')

        if (error) {
            throw new Error(error.message);
        }

        return data as ProductoDBDTO[];
    }

    async obtenerAgregados():Promise<AgregadoDBDTO[]>
    {
        const { data, error } = await this.sb.supabase
            .from('agregados')
            .select('*')

        if (error) {
            throw new Error(error.message);
        }

        return data as AgregadoDBDTO[];
    }

    async agregarProducto(producto: ProductoPostDTO):Promise<ProductoDBDTO>
    {
        const { data, error } = await this.sb.supabase
        .from('productos')
        .insert(producto)
        .select()
        .single()

        if (error) {
            throw new Error(error.message);
        }

        return data as ProductoDBDTO;
    }

    async agregarAgregado(agregado: AgregadoPostDTO):Promise<AgregadoDBDTO>
    {
        const { data, error } = await this.sb.supabase
        .from('agregados')
        .insert(agregado)
        .select()
        .single()

        if (error) {
            throw new Error(error.message);
        }

        return data as AgregadoDBDTO;
    }

    async eliminarAgregado(id:number)
    {
        const { error: errorDelete } = await this.sb.supabase
            .from('agregados')
            .delete()
            .eq('id', id);

        if (errorDelete) 
        {
            throw errorDelete;
        }
    }

    async eliminarProducto(id:number)
    {
        const { error: errorDelete } = await this.sb.supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (errorDelete) 
        {
            throw errorDelete;
        }
    }
}
