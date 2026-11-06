import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { PagosService } from './pagos.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from '../ocr/ocr.service';
import { ModificarPago } from './dto/modificarBanco.dto';
import { FiltrosPagosBancoDTO } from './dto/filtrosPagosBanco.dto';
import { GenerarExcelDTO } from 'src/reportes/excel/dto/generarExcel.dto';
import { ExcelService } from 'src/reportes/excel/excel.service';
import { GenerarReciboDTO } from 'src/reportes/pdf/dto/generarRecibo.dto';
import { GenerarContratoDTO } from 'src/reportes/pdf/dto/generarContrato.dto';
import { PdfService } from 'src/reportes/pdf/pdf.service';
import { PagoDTO } from './dto/pago.dto';
import { ArchivoSubidoDTO } from 'src/storage/dto/ArchivoSubidoDTO';
import { StorageService } from 'src/storage/storage.service';
import { DocumentoDTO } from 'src/documentos/dto/documento.dto';
import { CrearPagoComprobanteDTO } from './dto/crearPagoComprobante.dto';

// Cuentas de la empresa a las que se puede transferir (las mismas que acepta el portal de clientes)
const BANCOS_TRANSFERENCIA = ['COMAFI', 'Santander'];

@Controller('pagos')
export class PagosController 
{
    constructor(private pagosService: PagosService, private ocrService: OcrService, private excelService: ExcelService, private pdfService: PdfService, private storageService: StorageService){}
    
    @Get('/total')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async obtenerTotalTransferencias(@Query('fechaHoy') fechaHoy: string)
    {
        return await this.pagosService.traerMontoTotalMes(new Date(fechaHoy));
    }
    
    @Get('ingresos-efectivo')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async obtenerTotalIngresosEfectivo()
    {
        return await this.pagosService.obtenerTotalIngresosEfectivo();
    }

    @Get(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async obtenerCuotasIdPedido(@Param ('id', ParseIntPipe) id:number)
    {
        return await this.pagosService.traerPagosPedido(id);
    }


    @Get('bancos/:banco/resumen')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async obtenerResumenPagosBancos(@Param ('banco') banco:string, @Query() filtros: FiltrosPagosBancoDTO)
    {
        return await this.pagosService.traerResumenPagosBanco(banco, filtros);
    }

    @Get('bancos/:banco')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async obtenerPagosBancos(@Param ('banco') banco:string, @Query('rangoDesde', ParseIntPipe) rangoDesde: number,@Query('rangoHasta', ParseIntPipe) rangoHasta: number, @Query() filtros: FiltrosPagosBancoDTO)
    {
        return await this.pagosService.traerPagosBanco(banco, rangoDesde, rangoHasta, filtros);
    }
    
    @Get ('documento/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('descargar_imagenes') 
    async obtenerIdDocumento(@Param ('id', ParseIntPipe) id:number)
    {
        return await this.pagosService.traerIdDocumento(id);
    }

    @Post()
    @UseGuards(AuthGuard,PermisosGuard)
    async crearPago(@Body() dto: PagoDTO)
    {
        return await this.pagosService.crearPago(dto);
    }

    // Transferencia cargada por un empleado (mismo flujo que POST clientes-portal/pagos):
    // guarda el comprobante, crea el documento y registra el pago en una sola llamada.
    // El motivo va como 'Cuota': registrar_pago_completo completa primero la seña si falta.
    @Post('comprobante')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_administrativo')
    @UseInterceptors(FileInterceptor('comprobante'))
    async crearPagoTransferencia(@Body() dto: CrearPagoComprobanteDTO, @UploadedFile() archivo: ArchivoSubidoDTO)
    {
        const idPedido = Number(dto?.id_pedido);
        const monto = Number(dto?.monto);

        if (!archivo)
        {
            throw new BadRequestException('Falta el comprobante de la transferencia.');
        }

        if (!Number.isInteger(idPedido) || idPedido <= 0)
        {
            throw new BadRequestException('Pedido inválido.');
        }

        if (!Number.isFinite(monto) || monto <= 0)
        {
            throw new BadRequestException('El monto tiene que ser mayor a 0.');
        }

        if (!BANCOS_TRANSFERENCIA.includes(dto.banco))
        {
            throw new BadRequestException('El banco tiene que ser COMAFI o Santander.');
        }

        if (!dto.fecha || !dto.entidad_pago?.trim() || !dto.nroTransferencia?.trim())
        {
            throw new BadRequestException('Faltan datos de la transferencia.');
        }

        const idGrupo = await this.pagosService.obtenerIdGrupoPedido(idPedido);

        const nombreArchivo = `comprobante-${idPedido}-${Date.now()}-${archivo.originalname}`
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9._-]/g, '-');

        const rutaComprobante = await this.storageService.guardarImagen(
            { pedidoId: idPedido.toString(), nombreArchivo, carpetaGuardado: 'comprobantes-clientes' },
            archivo,
        );

        const documentoDTO: DocumentoDTO = { id_grupo: idGrupo, tipo: 'comprobante', archivo_url: rutaComprobante };

        return await this.pagosService.crearPago({
            id_pedido: idPedido,
            nro_transferencia: dto.nroTransferencia.trim(),
            monto,
            motivo: 'Cuota',
            fecha: dto.fecha,
            aprobado: true,
            banco: dto.banco,
            entidad_pago: dto.entidad_pago.trim(),
            documentoDTO,
        });
    }

    @Post('ocr')
    @UseInterceptors(FileInterceptor('comprobante'))
    async testOcr(@UploadedFile() file: ArchivoSubidoDTO) 
    {
        return await this.pagosService.comprobarComprobantePago(file.buffer)
    }

    @Post('excel')
    @UseGuards(AuthGuard)
    async descargarExcel(@Body() dto: GenerarExcelDTO, @Res() res: Response)
    {
        const buffer = await this.excelService.generarExcel(dto.nombreHoja, dto.columnas, dto.filas);

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${dto.nombreHoja || 'reporte'}.xlsx"`,
        });
        res.send(buffer);
    }

    @Post('recibo')
    @UseGuards(AuthGuard)
    async descargarRecibo(@Body() dto: GenerarReciboDTO, @Res() res: Response)
    {
        const buffer = await this.pdfService.generarReciboPago(dto);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="recibo-${dto.numero}.pdf"`,
        });
        res.send(buffer);
    }

    @Get(':id/recibo')
    @UseGuards(AuthGuard)
    async descargarReciboPago(@Param('id', ParseIntPipe) id: number, @Res() res: Response)
    {
        const dto = await this.pagosService.armarDatosRecibo(id);
        const buffer = await this.pdfService.generarReciboPago(dto);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="recibo-${dto.numero}.pdf"`,
        });
        res.send(buffer);
    }

    @Post('contrato')
    @UseGuards(AuthGuard)
    async descargarContrato(@Body() dto: GenerarContratoDTO, @Res() res: Response)
    {
        const buffer = await this.pdfService.generarContratoVenta(dto);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="contrato-${dto.colegioNombre}.pdf"`,
        });
        res.send(buffer);
    }

    @Delete(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_presupuesto')
    async eliminarPago(@Param('id', ParseIntPipe) id:number)
    {
        return await this.pagosService.eliminarPago(id);
    }

    @Patch('enviado')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async modificarEnviadoBanco(@Body() dto: ModificarPago)
    {
        return await this.pagosService.modificarEnviadoBanco(dto);
    }

    @Patch('aprobado')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async modificarAprobadoBanco(@Body() dto: ModificarPago)
    {
        return await this.pagosService.modificarAprobadoBanco(dto);
    }
}
