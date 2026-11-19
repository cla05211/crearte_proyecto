import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermisosGuard } from '../permisos/guards/permisos.guard';
import { RequierePermiso } from '../permisos/requiere_permismos.decorator';
import { SolicitarSubidaStorage } from './dto/SolicitarSubidaStorage.dto';
import { StorageService } from './storage.service';
import { limpiarNombreArchivo, REGLAS_ARCHIVO_GENERAL, validarTipoArchivo } from '../common/archivos-subida';

// Carpetas del bucket "imagenes" a las que se puede subir desde Ventas
const CARPETAS_PERMITIDAS = ['senias', 'recursos_adicionales'];

@Controller('storage')
export class StorageController
{
    constructor(private storageService: StorageService){}

    // Paso 1 de la subida directa: el front pide una URL firmada y sube el archivo con un PUT a Supabase.
    // Devuelve la ruta, que después viaja en el pedido de la venta (pagos de seña / recursos adicionales).
    @Post ('url-subida')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('crear_pedido') //POR AHORA
    async crearUrlSubida(@Body() dto: SolicitarSubidaStorage)
    {
        if (!CARPETAS_PERMITIDAS.includes(dto?.carpetaGuardado))
        {
            throw new BadRequestException('Carpeta de guardado no permitida.');
        }

        validarTipoArchivo(dto.mimetype, REGLAS_ARCHIVO_GENERAL);

        const ruta = `${dto.carpetaGuardado}/${limpiarNombreArchivo(dto.nombreArchivo)}`;
        const signedUrl = await this.storageService.crearUrlSubidaImagen(ruta);

        return { ruta, signedUrl };
    }

    @Get ('')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('descargar_imagenes') 
    async obtenerUrlArchivo(@Query('ruta') ruta: string)
    {
        return { url: await this.storageService.obtenerUrlArchivo(ruta)};
    }
}
