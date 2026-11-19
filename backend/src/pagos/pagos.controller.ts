import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PagosService } from './pagos.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { OcrService } from '../ocr/ocr.service';
import { ModificarPago } from './dto/modificarBanco.dto';
import { FiltrosPagosBancoDTO } from './dto/filtrosPagosBanco.dto';
import { GenerarExcelDTO } from 'src/reportes/excel/dto/generarExcel.dto';
import { ExcelService } from 'src/reportes/excel/excel.service';
import { GenerarReciboDTO } from 'src/reportes/pdf/dto/generarRecibo.dto';
import { GenerarContratoDTO } from 'src/reportes/pdf/dto/generarContrato.dto';
import { PdfService } from 'src/reportes/pdf/pdf.service';
import { PagoDTO } from './dto/pago.dto';
import { StorageService } from 'src/storage/storage.service';
import { DocumentoDTO } from 'src/documentos/dto/documento.dto';
import { CARPETA_OCR_TEMPORAL, limpiarNombreArchivo, REGLAS_COMPROBANTE, validarPrefijoRuta, validarTipoArchivo } from 'src/common/archivos-subida';
import { prefijoComprobantePago } from './comprobantes';
import { randomUUID } from 'crypto';
import { StaffOClienteGuard } from 'src/auth/guards/staff-o-cliente.guard';
import { contentDisposition } from 'src/common/content-disposition';
import { CrearPagoComprobanteDTO, SolicitarSubidaComprobanteDTO } from './dto/crearPagoComprobante.dto';

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

    // Pago cargado por un empleado sin comprobante (efectivo, pagar seña / cuota desde la cuenta corriente).
    // Lo usa el front (PagosService.crearPago); se había quitado en 6aad204 y la cuenta corriente quedaba sin poder registrar pagos.
    @Post()
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_administrativo')
    async crearPago(@Body() dto: PagoDTO)
    {
        return await this.pagosService.crearPago(dto);
    }

    // Paso 1 de la transferencia que carga un empleado: URL firmada para subir el comprobante directo a Supabase
    @Post('comprobante/url-subida')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_administrativo')
    async crearUrlSubidaComprobante(@Body() dto: SolicitarSubidaComprobanteDTO)
    {
        const idPedido = Number(dto?.id_pedido);

        if (!Number.isInteger(idPedido) || idPedido <= 0)
        {
            throw new BadRequestException('Pedido inválido.');
        }

        validarTipoArchivo(dto.mimetype, REGLAS_COMPROBANTE);

        const ruta = `${prefijoComprobantePago(idPedido)}${Date.now()}-${limpiarNombreArchivo(dto.nombreArchivo)}`;
        const signedUrl = await this.storageService.crearUrlSubidaImagen(ruta);

        return { ruta, signedUrl };
    }

    // Transferencia cargada por un empleado (mismo flujo que POST clientes-portal/pagos):
    // el comprobante ya está subido (paso 1); acá se valida, se crea el documento y se registra el pago.
    // El motivo va como 'Cuota': registrar_pago_completo completa primero la seña si falta.
    @Post('comprobante')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_administrativo')
    async crearPagoTransferencia(@Body() dto: CrearPagoComprobanteDTO)
    {
        const idPedido = Number(dto?.id_pedido);
        const monto = Number(dto?.monto);

        if (!Number.isInteger(idPedido) || idPedido <= 0)
        {
            throw new BadRequestException('Pedido inválido.');
        }

        const rutaComprobante = validarPrefijoRuta(dto.ruta, prefijoComprobantePago(idPedido));

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

        await this.storageService.validarImagenSubida(rutaComprobante, REGLAS_COMPROBANTE);

        const idGrupo = await this.pagosService.obtenerIdGrupoPedido(idPedido);

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

    // Paso 1 del OCR: URL firmada para subir el comprobante a una carpeta temporal.
    // La usan empleados (Ventas, cuenta corriente) y clientes del portal.
    @Post('ocr/url-subida')
    @UseGuards(StaffOClienteGuard)
    async crearUrlSubidaOcr(@Body('mimetype') mimetype: string)
    {
        validarTipoArchivo(mimetype, REGLAS_COMPROBANTE);

        const ruta = `${CARPETA_OCR_TEMPORAL}/${randomUUID()}`;
        const signedUrl = await this.storageService.crearUrlSubidaImagen(ruta);

        return { ruta, signedUrl };
    }

    // Paso 2 del OCR: lee el comprobante subido y lo borra (solo se guardaba para leerlo)
    @Post('ocr')
    @UseGuards(StaffOClienteGuard)
    async leerComprobanteOcr(@Body('ruta') ruta: string)
    {
        if (!/^ocr-temporal\/[0-9a-f-]{36}$/.test(ruta ?? ''))
        {
            throw new BadRequestException('La ruta del archivo no es válida.');
        }

        await this.storageService.validarImagenSubida(ruta, REGLAS_COMPROBANTE);

        try
        {
            const archivo = await this.storageService.descargarArchivo(ruta);
            return await this.pagosService.comprobarComprobantePago(archivo);
        }
        finally
        {
            await this.storageService.eliminarImagen(ruta);
        }
    }

    @Post('excel')
    @UseGuards(AuthGuard)
    async descargarExcel(@Body() dto: GenerarExcelDTO, @Res() res: Response)
    {
        const buffer = await this.excelService.generarExcel(dto.nombreHoja, dto.columnas, dto.filas);

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': contentDisposition('attachment', `${dto.nombreHoja || 'reporte'}.xlsx`),
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
            'Content-Disposition': contentDisposition('attachment', `contrato-${dto.colegioNombre}.pdf`),
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
