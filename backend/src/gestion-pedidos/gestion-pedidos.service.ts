import { Injectable } from '@nestjs/common';
import { ColegiosService } from 'src/colegios/colegios.service';
import { CrearPedidoDTO } from './dto/crearPedido.dto';
import { GruposService } from 'src/grupos/grupos.service';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { ProductosPedidoService } from 'src/productos-pedido/productos-pedido-service.service';
import { ProductoPedidoDTO } from 'src/productos-pedido/dto/ProductoPedido.dto';
import { PadreResponsableService } from 'src/padre-responsable/padre-responsable-service.service';
import { PadreResponsableDTO } from 'src/padre-responsable/dto/padreResponsable.dto';
import { AlumnoResponsableService } from 'src/alumno-responsable/alumno-responsable.service';
import { alumnoResponsableDTO } from 'src/alumno-responsable/dto/alumnoResponsable.dto';
import { DocumentosService } from 'src/documentos/documentos.service';
import { DocumentoDTO } from 'src/documentos/dto/documento.dto';
import { PagosService } from 'src/pagos/pagos.service';
import { CuentaCorrienteService } from 'src/cuenta-corriente/CuentaCorriente.service';
import { CuotasService } from 'src/cuotas/cuotas.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { BadRequestException } from '@nestjs/common';
import { PedidoResponseVentas } from './dto/PedidoResponseVentas.dto';
import { AuditoriasService } from 'src/auditorias/auditorias.service';
import { ModificarPlanPedidoDTO } from './dto/ModificarPlanPedido';

@Injectable()
export class GestionPedidosService 
{
    constructor(private colegios:ColegiosService, private grupos: GruposService, 
        private pedidos:PedidosService, private productosPedido: ProductosPedidoService,
        private padres:PadreResponsableService, private alumnos:AlumnoResponsableService,
        private documentos:DocumentosService, private pagos:PagosService, private cuentaCorriente: CuentaCorrienteService,
        private cuotas: CuotasService, private sb: SupabaseService, private auditoriaService: AuditoriasService){}

    async crearPedido(dto:CrearPedidoDTO)
    {
        const { data, error } = await this.sb.supabase.rpc(
        'crear_pedido_completo',
        {
            payload: dto
        }
        );

        if (error)
        {
            throw new BadRequestException(error.message);
        }
        return data;
    }

    async obtenerPedidosVentas():Promise<PedidoResponseVentas[]>
    {
        const { data, error } = await this.sb.supabase
        .from("pedidos")
        .select(`
            *,
            grupos(
                *,
                colegios(*)
            ),
            productos_pedidos(*),
            cuotas(id)
        `)
        .eq("estado_general", "Venta realizada") 
        .order("created_at", {
            referencedTable: "grupos",
            ascending: false,
            });

        if (error) 
        {
            throw new Error(error.message);
        }

        const pedidosVentas: PedidoResponseVentas[] = data.map(pedido => ({
            colegioDTO: pedido.grupos.colegios,
            grupoDTO: pedido.grupos,
            pedidoDTO: pedido,
            productosPedidoDTO: pedido.productos_pedidos,
            nroCuotas: pedido.cuotas.length
        }));

        return pedidosVentas;
    }

    async modificarPlanPedido(dto: ModificarPlanPedidoDTO)
{
    const { data, error } = await this.sb.supabase.rpc(
        'modificar_plan_pedido',
        { payload: dto }
    );

    if (error)
    {
        throw new BadRequestException(error.message);
    }
    return data;
}


}
