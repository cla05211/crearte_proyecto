import { BadRequestException, Controller, Post, UseGuards, Body, Get, Patch, Query, ParseIntPipe, Param, ParseBoolPipe, Req } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { GestionPedidosService } from './gestion-pedidos.service';
import { CrearPedidoDTO } from './dto/crearPedido.dto';
import { ModificarPlanPedidoDTO } from './dto/ModificarPlanPedido';
import { ESTADOS_BOCETO_BANDERA, ModificarBanderaDTO } from './dto/ControlBanderasDTO';
import { TIPOS_AUDITORIA, TipoAuditoria } from 'src/auditorias/dto/insertarAuditoria.dto';

const TAMANIO_MAXIMO_PAGINA_AUDITORIA = 100;

@Controller('gestion-pedidos')
export class GestionPedidosController 
{
    constructor(private gestionService: GestionPedidosService){}

    @Post ('crear-pedido')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('crear_pedido')
    async crearPedido(@Body() dto: CrearPedidoDTO)
    {
        return await this.gestionService.crearPedido(dto);
    }

    @Get ('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('crear_pedido')
    async obtenerPedidosVentas( @Query('rangoDesde', ParseIntPipe) rangoDesde: number, @Query('rangoHasta', ParseIntPipe) rangoHasta: number,   @Query('busqueda') busqueda?: string, @Query('promo', ParseIntPipe) promo?: number,)
    {
        return await this.gestionService.obtenerPedidosVentas(rangoDesde, rangoHasta, busqueda, promo);
    }

    @Get ('presupuesto-clientes/:idGrupo')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_presupuesto')
    async obtenerPresupuestoPedidoClientesPage(@Param('idGrupo', ParseIntPipe) idGrupo:number)
    {
        return await this.gestionService.obtenerPresupuestoPedidosClientes(idGrupo);
    }
        
    @Get ('importe/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_administrativo')
    async obtenerImporteTotalPedido(@Param('id', ParseIntPipe)idPedido: number)
    {
        return await this.gestionService.obtenerImporteTotalPedido(idPedido);
    }
        
    @Get ('control-talles-disenio')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_talles_disenio')
    async obtenerDatosPedidosControlTallesDisenio(@Query('promo', ParseIntPipe) promo: number, @Query('mes', ParseIntPipe) mes: number, @Query('busqueda') busqueda?: string)
    {
        return await this.gestionService.obtenerDatosPedidosControlTallesDisenio(mes,promo,busqueda);
    }

    @Get ('control-produccion')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async obtenerDatosControlProduccion(@Query('mesEntrega', ParseIntPipe) mesEntrega: number, @Query('anioEntrega', ParseIntPipe) anioEntrega: number, @Query('enviadosFabrica', ParseBoolPipe) enviadosFabrica: boolean)
    {
        return await this.gestionService.obtenerDatosProduccion(mesEntrega,anioEntrega,enviadosFabrica);
    }

    @Get ('control-banderas')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_banderas')
    async obtenerPedidosControlBanderas(@Query('anio', ParseIntPipe) anio: number, @Query('mes', ParseIntPipe) mes: number)
    {
        return await this.gestionService.obtenerPedidosControlBandera(mes, anio);
    }

    // Botón "Enviar a fábrica" de control de fábrica
    @Post('enviar-fabrica/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_control_produccion')
    async enviarPedidoFabrica(@Param('id', ParseIntPipe) idPedido: number, @Body() dto: { mesEntrega: number; anioEntrega: number })
    {
        const mes = Number(dto?.mesEntrega);
        const anio = Number(dto?.anioEntrega);

        if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio) || anio < 2000)
        {
            throw new BadRequestException('Mes o año de entrega inválido.');
        }

        return await this.gestionService.enviarPedidoFabrica(idPedido, mes, anio);
    }

    @Patch('banderas/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_banderas')
    async modificarBandera(@Param('id', ParseIntPipe) idBandera: number, @Body() dto: ModificarBanderaDTO)
    {
        if (dto.estadoBoceto !== undefined && !ESTADOS_BOCETO_BANDERA.includes(dto.estadoBoceto))
        {
            throw new BadRequestException('Estado de boceto inválido.');
        }

        if (dto.idDiseniadora !== undefined && dto.idDiseniadora !== null && !Number.isInteger(dto.idDiseniadora))
        {
            throw new BadRequestException('Diseñadora inválida.');
        }

        if (dto.motivoPerdidaBeneficio !== undefined && dto.motivoPerdidaBeneficio !== null && typeof dto.motivoPerdidaBeneficio !== 'string')
        {
            throw new BadRequestException('Motivo inválido.');
        }

        if (dto.enviadaProduccion !== undefined && typeof dto.enviadaProduccion !== 'boolean')
        {
            throw new BadRequestException('Enviada a producción inválido.');
        }

        await this.gestionService.modificarBandera(idBandera, dto);
    }

    @Patch('modificar-pedidos')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async modificarPlanPedido(@Body() dto: ModificarPlanPedidoDTO, @Req() req)
    {
        return await this.gestionService.modificarPlanPedido(dto, { idUsuario: req.usuario.id });
    }

    // Baja de un colegio: pasa el pedido a "Cancelado", opcionalmente devuelve lo pagado
    // (un pago negativo, los pagos originales quedan) y cancela los WhatsApp pendientes
    @Patch('cancelar/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async cancelarPedido(@Param('id', ParseIntPipe) idPedido: number, @Body() dto: { devolucionPlata: boolean; banco?: string })
    {
        if (typeof dto?.devolucionPlata !== 'boolean')
        {
            throw new BadRequestException('Falta indicar si se devuelve la plata.');
        }

        if (dto.banco !== undefined && (typeof dto.banco !== 'string' || !dto.banco.trim()))
        {
            throw new BadRequestException('Banco inválido.');
        }

        await this.gestionService.cancelarPedido(idPedido, dto.devolucionPlata, dto.banco?.trim());
    }

    //--- Auditoría: cambios de presupuesto, beneficios, diseño y talles ---

    @Get('auditoria')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_auditoria')
    async obtenerAuditoria(
        @Query('rangoDesde', ParseIntPipe) rangoDesde: number,
        @Query('rangoHasta', ParseIntPipe) rangoHasta: number,
        @Query('tipo') tipo?: string,
        @Query('busqueda') busqueda?: string,
        @Query('idPedido') idPedido?: string,
    )
    {
        if (rangoDesde < 0 || rangoHasta < rangoDesde || rangoHasta - rangoDesde >= TAMANIO_MAXIMO_PAGINA_AUDITORIA)
        {
            throw new BadRequestException('Rango de paginación inválido.');
        }

        if (tipo && !TIPOS_AUDITORIA.includes(tipo as TipoAuditoria))
        {
            throw new BadRequestException('Tipo de auditoría inválido.');
        }

        const idPedidoNumero = idPedido ? Number(idPedido) : undefined;
        if (idPedidoNumero !== undefined && !Number.isInteger(idPedidoNumero))
        {
            throw new BadRequestException('Pedido inválido.');
        }

        return await this.gestionService.obtenerAuditoria({
            rangoDesde,
            rangoHasta,
            tipo: (tipo || undefined) as TipoAuditoria | undefined,
            busqueda: busqueda?.trim() || undefined,
            idPedido: idPedidoNumero,
        });
    }

    // Descarga la versión anterior o nueva de un boceto/firmado que se cambió
    @Get('auditoria/:id/archivo')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_auditoria')
    async obtenerUrlArchivoAuditoria(@Param('id', ParseIntPipe) idAuditoria: number, @Query('version') version: string)
    {
        if (version !== 'anterior' && version !== 'nuevo')
        {
            throw new BadRequestException('Versión inválida.');
        }

        return await this.gestionService.obtenerUrlArchivoAuditoria(idAuditoria, version);
    }


}
