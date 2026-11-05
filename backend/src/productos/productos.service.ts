import { PlanDisponibleDTO } from './dto/PlanDisponible.dto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { ProductoConPrecioResponseDTO} from './dto/ProductoConPrecioResponse.dto';
import { AgregadoDBDTO } from './dto/Agregado.dto';
import { ProductoPostDTO } from './dto/ProductoPOST.dto';
import { AgregadoPostDTO } from './dto/AgregadoPost.dto';
import { InternalServerErrorException } from '@nestjs/common';
import { PreciosBeneficiosResponseDTO } from './dto/PreciosBeneficiosResponse.dto';
import { ProductoPreciosDTO } from './dto/ProductoPrecios.dto';
import { ModificarProductoPreciosDTO } from './dto/ModificarProductoPrecios.dto';
import { error } from 'console';
import { AgregarPlanDTO } from './dto/AgregarPlanDTO';

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
            id: p.id,
            id_producto: p.id_producto,
            cantidad_desde: p.cantidad_desde,
            cantidad_hasta: p.cantidad_hasta,
            cuotas: p.cuotas,
            con_senia: p.con_senia,
            activo: p.activo,
            valor_senia: p.valor_senia,
            valor_cuota: p.valor_cuota,
            beneficio: p.beneficio,
            nombre: p.productos.nombre,
            descripcion: p.productos.descripcion
        }));

        return productos;
    }

    async obtenerProductoPrecioId(id_producto:number):Promise<ProductoConPrecioResponseDTO>
    {
        //Esto no se usa, pero no funciona porque id coincide con muchos
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
            id: data.id,
            id_producto: data.id_producto,
            cantidad_desde: data.cantidad_desde,
            cantidad_hasta: data.cantidad_hasta,
            cuotas: data.cuotas,
            con_senia: data.con_senia,
            activo: data.activo,
            valor_senia: data.valor_senia,
            valor_cuota: data.valor_cuota,
            beneficio: data.beneficio,
            nombre: data.productos.nombre,
            descripcion: data.productos.descripcion,
        };

        return producto;
    }

    // conSenia es opcional mientras el front mande solo la cantidad de cuotas.
    // Sin él, si hay dos planes con las mismas cuotas (con y sin seña), .single() falla.
    async obtenerPreciosId(id_producto:number, nroCuotas: number, cantidad:number, conSenia?: boolean):Promise<ProductoPreciosDTO>
    {
        let consulta = this.sb.supabase
        .from("precios_productos")
        .select(`valor_cuota, valor_senia`)
        .eq('id_producto', id_producto)
        .eq('cuotas', nroCuotas)
        .lte('cantidad_desde', cantidad)
        .gte('cantidad_hasta', cantidad);

        if (conSenia !== undefined) consulta = consulta.eq('con_senia', conSenia);

        const { data, error } = await consulta.single();

        if (error) {
            throw new Error(error.message);
        }

        const producto: ProductoPreciosDTO = {
            valor_senia: data.valor_senia,
            valor_cuota: data.valor_cuota,
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
            valor_senia: producto.valor_senia,
            valor_cuota: producto.valor_cuota,
            beneficio: producto.beneficio,
            con_senia: producto.senia
        })
        .select(`
            *,
            productos (nombre, descripcion)
        `)
        .single();

        if (errorPrecio) {
            throw new Error(errorPrecio?.message);
        }

        const nuevoProducto: ProductoConPrecioResponseDTO = {
        id: dataProductoPrecio!.id,
        id_producto: dataProductoPrecio!.id_producto,
        cantidad_desde: dataProductoPrecio!.cantidad_desde,
        cantidad_hasta: dataProductoPrecio!.cantidad_hasta,
        cuotas: dataProductoPrecio!.cuotas,
        con_senia: dataProductoPrecio!.con_senia,
        activo: dataProductoPrecio!.activo,
        valor_senia: dataProductoPrecio!.valor_senia,
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

    // No filtra por activo: también se usa al recalcular pedidos que ya tienen un plan desactivado.
    // conSenia es opcional (ver obtenerPreciosId).
    async obtenerPreciosBeneficios(producto: number, cantidad:number, cuotas:number, conSenia?: boolean): Promise<PreciosBeneficiosResponseDTO | null>
    {
        let consulta = this.sb.supabase
        .from('precios_productos')
        .select('valor_senia, valor_cuota, beneficio')
        .eq('cuotas', cuotas)
        .eq('id_producto', producto)
        .lte('cantidad_desde', cantidad)
        .gte('cantidad_hasta', cantidad);

        if (conSenia !== undefined) consulta = consulta.eq('con_senia', conSenia);

        const { data, error } = await consulta.maybeSingle();

        if (error) {
            throw new Error(error.message);
        }

        return data as PreciosBeneficiosResponseDTO | null;
    }
    
    // Planes que ofrece el catálogo. Es el único lugar donde se deduce si un plan lleva seña
    // (seña != cuota en la lista de precios); una vez elegido, el pedido lo guarda en pedidos.con_senia.
    async obtenerPlanesDisponibles():Promise<PlanDisponibleDTO[]>
    {
        const { data, error } = await this.sb.supabase
        .from('precios_productos')
        .select('cuotas, con_senia')
        .eq('activo',true);

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        // Cada plan tiene una fila por producto y tramo: se deja uno por (cuotas, con_senia)
        const planes = new Map<string, PlanDisponibleDTO>();
        for (const p of data)
        {
            planes.set(`${p.cuotas}-${p.con_senia}`, { cuotas: p.cuotas, conSenia: p.con_senia });
        }

        // Menos pagos primero; a igual cantidad, cuotas iguales antes que seña (mismo orden que el front)
        return [...planes.values()].sort((a, b) =>
            ((a.cuotas + 1) * 2 + (a.conSenia ? 1 : 0)) - ((b.cuotas + 1) * 2 + (b.conSenia ? 1 : 0)));
    }


    //PRecios productos
    async modificarPreciosProducto(idProducto:number, preciosDto:ModificarProductoPreciosDTO[]):Promise<number>
    {
        const { data, error } = await this.sb.supabase
            .rpc('modificar_precios_producto', {
                p_id_producto: idProducto,
                // La RPC lee los campos en snake_case
                p_precios: preciosDto.map(p => ({ id: p.id, valor_cuota: p.valorCuota, valor_senia: p.valorSeña }))
            });

        if (error) 
        {
            throw new BadRequestException(error.message);
        }

        return data as number;
    }

    //Planes de cuotas
    async activarDesactivarPlan(cuotas: number, senia: boolean, activo: boolean)
    {
        const {error} = await this.sb.supabase
        .from('precios_productos')
        .update({ activo })
        .eq('cuotas', cuotas)
        .eq('con_senia', senia);

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }

    async agregarPlan(dto: AgregarPlanDTO)
    {
        const conSenia = dto.senia;

        const seniasRequeridas = [
            dto.precioSeniaCampera20a25, dto.precioSeniaCampera26a40, dto.precioSeniaCampera41a55,
            dto.precioSeniaCamperaUniversitaria20a25, dto.precioSeniaCamperaUniversitaria26a40, dto.precioSeniaCamperaUniversitaria41a55,
            dto.precioSeniaJoggin20a25, dto.precioSeniaJoggin26a40, dto.precioSeniaJoggin41a55,
            dto.precioSeniaCombo20a25, dto.precioSeniaCombo26a40, dto.precioSeniaCombo41a55,
            dto.precioSeniaChomba20a55,
        ];
        if (conSenia && seniasRequeridas.some(v => v === undefined || v === null))
        {
            throw new BadRequestException('Un plan con seña necesita todos los precios de seña');
        }


        const fila = (idProducto: number, desde: number, hasta: number, cuota: number, senia?: number) => ({
            id_producto: idProducto,
            cantidad_desde: desde,
            cantidad_hasta: hasta,
            cuotas: dto.cuotas,
            valor_cuota: cuota,
            valor_senia: conSenia && senia != null ? senia : cuota,
            con_senia: conSenia,
            activo: true,
            beneficio: null,
        });

        const porTramos = (idProducto: number, cuotas: number[], senias: (number | undefined)[]) => [
            fila(idProducto, 1,  25,  cuotas[0], senias[0]),
            fila(idProducto, 26, 40,  cuotas[1], senias[1]),
            fila(idProducto, 41, 999, cuotas[2], senias[2]),
        ];

        const campera = {
            cuotas: [dto.precioCuotaCampera20a25, dto.precioCuotaCampera26a40, dto.precioCuotaCampera41a55],
            senias: [dto.precioSeniaCampera20a25, dto.precioSeniaCampera26a40, dto.precioSeniaCampera41a55],
        };
        const universitaria = {
            cuotas: [dto.precioCuotaCamperaUniversitaria20a25, dto.precioCuotaCamperaUniversitaria26a40, dto.precioCuotaCamperaUniversitaria41a55],
            senias: [dto.precioSeniaCamperaUniversitaria20a25, dto.precioSeniaCamperaUniversitaria26a40, dto.precioSeniaCamperaUniversitaria41a55],
        };
        const jogging = {
            cuotas: [dto.precioCuotaJoggin20a25, dto.precioCuotaJoggin26a40, dto.precioCuotaJoggin41a55],
            senias: [dto.precioSeniaJoggin20a25, dto.precioSeniaJoggin26a40, dto.precioSeniaJoggin41a55],
        };
        const combo = {
            cuotas: [dto.precioCuotaCombo20a25, dto.precioCuotaCombo26a40, dto.precioCuotaCombo41a55],
            senias: [dto.precioSeniaCombo20a25, dto.precioSeniaCombo26a40, dto.precioSeniaCombo41a55],
        };

        const planDto = [
            ...porTramos(63, campera.cuotas, campera.senias),             // Campera
            ...porTramos(64, campera.cuotas, campera.senias),             // Buzo 
            fila(65, 1, 999, dto.precioCuotaChomba20a55, dto.precioSeniaChomba20a55), // Chomba 
            fila(66, 1, 999, dto.precioCuotaChomba20a55, dto.precioSeniaChomba20a55), // Remera 
            ...porTramos(67, combo.cuotas, combo.senias),                 // Combo: Campera y Chomba
            ...porTramos(68, combo.cuotas, combo.senias),                 // Combo: Campera y Remera
            ...porTramos(69, combo.cuotas, combo.senias),                 // Combo: Buzo y Remera
            ...porTramos(70, combo.cuotas, combo.senias),                 // Combo: Buzo y Chomba
            ...porTramos(71, universitaria.cuotas, universitaria.senias), // Campera Universitaria
            ...porTramos(72, jogging.cuotas, jogging.senias),             // Pantalón Jogging
        ];

        const {error} = await this.sb.supabase
        .from('precios_productos')
        .insert(planDto);

        if (error) 
        {
            throw new BadRequestException(error.message);
        }
    }

}
