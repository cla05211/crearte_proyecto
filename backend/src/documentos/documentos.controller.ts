import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../permisos/guards/permisos.guard';
import { RequierePermiso } from '../permisos/requiere_permismos.decorator';
import { DocumentosService } from './documentos.service';

@Controller('documentos')
export class DocumentosController 
{
    constructor(private documentosService: DocumentosService){}

    @Get ('/:id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('descargar_imagenes') 
    async obtenerUrlArchivo(@Param ('id', ParseIntPipe) id:number)
    {
        return { url: await this.documentosService.obtenerArchivoUrl(id)};
    }

    
}
