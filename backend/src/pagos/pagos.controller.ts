import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { PagosService } from './pagos.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from '../ocr/ocr.service';
import type { ArchivoSubido } from 'src/storage/storage.service';
import { ModificarPago } from './dto/modificarBanco.dto';
import { GenerarExcelDTO } from 'src/reportes/excel/dto/generarExcel.dto';
import { ExcelService } from 'src/reportes/excel/excel.service';
import { GenerarReciboDTO } from 'src/reportes/pdf/dto/generarRecibo.dto';
import { PdfService } from 'src/reportes/pdf/pdf.service';

@Controller('pagos')
export class PagosController 
{
    constructor(private pagosService: PagosService, private ocrService: OcrService, private excelService: ExcelService, private pdfService: PdfService){}
    
    @Get(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('modificar_pedidos')
    async obtenerCuotasIdPedido(@Param ('id', ParseIntPipe) id:number)
    {
        return await this.pagosService.traerPagosPedido(id);
    }

    @Get('bancos/:banco')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_bancos')
    async obtenerPagosBancos(@Param ('banco') banco:string, @Query('rangoDesde', ParseIntPipe) rangoDesde: number,@Query('rangoHasta', ParseIntPipe) rangoHasta: number)
    {
        return await this.pagosService.traerPagosBanco(banco, rangoDesde, rangoHasta);
    }
    
    @Get ('documento/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('descargar_imagenes') 
    async obtenerIdDocumento(@Param ('id', ParseIntPipe) id:number)
    {
        return await this.pagosService.traerIdDocumento(id);
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

    @Post('ocr')
    @UseInterceptors(FileInterceptor('comprobante'))
    async testOcr(@UploadedFile() file: ArchivoSubido) 
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
}
