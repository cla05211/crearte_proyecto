import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { SubirArchivoStorage } from './dto/SubirArchivoStorage.dto';
import { StorageService } from './storage.service';
import type { ArchivoSubido } from './storage.service';

@Controller('storage')
export class StorageController
{
    constructor(private storageService: StorageService){}

    @Post ('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('crear_pedido') //POR AHORA
    @UseInterceptors(FileInterceptor('archivo'))
    async agregarProducto(@UploadedFile() archivo: ArchivoSubido, @Body() dto: SubirArchivoStorage)
    {
        return await this.storageService.guardarImagen(dto, archivo);
    }
}
