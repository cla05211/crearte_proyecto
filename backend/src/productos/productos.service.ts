import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { ProductoConPrecioResponseDTO} from './dto/ProductoConPrecioResponse.dto';
import { AgregadoDBDTO } from './dto/Agregado.dto';
import { ProductoPostDTO } from './dto/ProductoPOST.dto';
import { AgregadoPostDTO } from './dto/AgregadoPost.dto';
import { InternalServerErrorException } from '@nestjs/common';
import { PreciosBeneficiosResponseDTO } from './dto/PreciosBeneficiosResponse.dto';

@Injectable()
export class ProductosService 
{
    constructor(private sb: SupabaseService){}

    async obtenerProductos():Promise<ProductoConPrecioResponseDTO[]>
    {
        const { data, error } = await this.sb.supabase
        .from("precios_productos")
        .select(`
            *,
            productos (nombre, descripcion)
        `);

        if (error) {
            throw new Error(error.message);
        }

        const productos: ProductoConPrecioResponseDTO[] = data.map(p => ({
            id_producto: p.id_producto,
            cantidad_desde: p.cantidad_desde,
            cantidad_hasta: p.cantidad_hasta,
            cuotas: p.cuotas,
            valor_senia: p.seña,
            valor_cuota: p.valor_cuota,
            beneficio: p.beneficio,
            nombre: p.productos.nombre,
            descripcion: p.productos.descripcion
        }));

        return productos;
    }

    async obtenerProductoPrecioId(id_producto:number):Promise<ProductoConPrecioResponseDTO>
    {
        const { data, error } = await this.sb.supabase
        .from("precios_productos")
        .select(`
            *,
            productos (nombre, descripcion)
        `)
        .eq('id_producto', id_producto)
        .single();

        if (error) {
            throw new Error(error.message);
        }

        const producto: ProductoConPrecioResponseDTO = {
            id_producto_precio: data.id_producto,
            cantidad_desde: data.cantidad_desde,
            cantidad_hasta: data.cantidad_hasta,
            cuotas: data.cuotas,
            seña: data.seña,
            valor_cuota: data.valor_cuota,
            beneficio: data.beneficio,
            nombre: data.productos.nombre,
            descripcion: data.productos.descripcion,
        };

        return producto;
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

    async agregarProductoPrecio(producto: ProductoPostDTO):Promise<ProductoConPrecioResponseDTO>
    {
        const { data: dataProducto, error } = await this.sb.supabase
        .from('productos')
        .insert({nombre: producto.nombre, descripcion: producto.descripcion})
        .select('id')
        .single()
        
        if (error) {
            throw new Error(error.message);
        }
        
        const { data: dataProductoPrecio , error: errorPrecio } = await this.sb.supabase
        .from("precios_productos")
        .insert({
            id_producto: dataProducto!.id,
            cantidad_desde: producto.cantidad_desde,
            cantidad_hasta: producto.cantidad_hasta,
            cuotas: producto.cuotas,
            seña: producto.seña,
            valor_cuota: producto.valor_cuota,
            beneficio: producto.beneficio,
        })
        .select(`
            *,
            productos (nombre, descripcion)
        `)
        .single();

        if (error) {
            throw new Error(errorPrecio?.message);
        }

        const nuevoProducto: ProductoConPrecioResponseDTO = {
        id_producto_precio: dataProductoPrecio!.id_producto,
        cantidad_desde: dataProductoPrecio!.cantidad_desde,
        cantidad_hasta: dataProductoPrecio!.cantidad_hasta,
        cuotas: dataProductoPrecio!.cuotas,
        seña: dataProductoPrecio!.seña,
        valor_cuota: dataProductoPrecio!.valor_cuota,
        beneficio: dataProductoPrecio!.beneficio,
        nombre: dataProductoPrecio!.productos.nombre,
        descripcion: dataProductoPrecio!.productos.descripcion,
        };

        return nuevoProducto as ProductoConPrecioResponseDTO;
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

    async obtenerPreciosBeneficios(producto: number, cantidad:number, cuotas:number): Promise<PreciosBeneficiosResponseDTO | null>
    {
        const { data, error } = await this.sb.supabase
        .from('precios_productos')
        .select('valor_senia, valor_cuota, beneficio')
        .eq('cuotas', cuotas)
        .eq('id_producto', producto)
        .lte('cantidad_desde', cantidad)
        .gte('cantidad_hasta', cantidad)
        .maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        return data as PreciosBeneficiosResponseDTO | null;
    }
}
