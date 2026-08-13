import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from '../ocr/ocr.service';
import type { ArchivoSubido } from 'src/storage/storage.service';
import { ModificarPago } from './dto/modificarBanco.dto';

@Controller('pagos')
export class PagosController 
{
    constructor(private pagosService: PagosService, private ocrService: OcrService){}
    
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
    async obtenerPagosBancos(@Param ('banco') banco:string)
    {
        return await this.pagosService.traerPagosBanco(banco);
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
}
