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

@Injectable()
export class GestionPedidosService 
{
    constructor(private colegios:ColegiosService, private grupos: GruposService, 
        private pedidos:PedidosService, private productosPedido: ProductosPedidoService,
        private padres:PadreResponsableService, private alumnos:AlumnoResponsableService,
        private documentos:DocumentosService, private pagos:PagosService, private cuentaCorriente: CuentaCorrienteService,
        private cuotas: CuotasService){}

    async crearPedido(dto:CrearPedidoDTO)
    {
        console.log("Iniciando pedido");
        const id_colegio = await this.colegios.crearColegio(dto.colegioDTO);
        dto.grupoDTO.id_colegio = id_colegio;
        
        const id_grupo = await this.grupos.crearGrupo(dto.grupoDTO)

        dto.pedidoDTO.id_grupo = id_grupo;
        const id_pedido = await this.pedidos.crearPedido(dto.pedidoDTO);

        dto.productosPedidoDTO.forEach((productoPedido: ProductoPedidoDTO) => {productoPedido.id_pedido = id_pedido});
        await this.productosPedido.crearPedido(dto.productosPedidoDTO) 

        dto.padresResponsablesDTO.forEach((padreResponsable: PadreResponsableDTO) => {padreResponsable.id_grupo = id_grupo});
        await this.padres.crearPadresResponsables(dto.padresResponsablesDTO);

        dto.alumnosResponsablesDTO.forEach((alumnoResponsable: alumnoResponsableDTO) => {alumnoResponsable.id_grupo = id_grupo});
        await this.alumnos.crearAlumnosResponsables(dto.alumnosResponsablesDTO);

        dto.pagoDTO.id_pedido = id_pedido;
        const id_pago = await this.pagos.crearPago(dto.pagoDTO);

        if (Array.isArray(dto.documentoDTO))
        {
            dto.documentoDTO.forEach((documento: DocumentoDTO) => {documento.id_grupo = id_grupo})
        }
        else
        {
            dto.documentoDTO.id_grupo = id_grupo;
        }
        const ids_documentos = await this.documentos.subirDocumento(dto.documentoDTO);

        for (const id_documento of ids_documentos)
        {
            await this.documentos.subirDocumentoPago({id_pago: id_pago, id_documento: id_documento});
        }

        dto.movimientoDTO.id_grupo = id_grupo;
        await this.cuentaCorriente.crearMovimiento(dto.movimientoDTO)
        
       
    }
}
