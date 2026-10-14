import { BadRequestException, Injectable } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { SubirDisenioDTO } from './dto/SubirDisenioDTO';
import { ReemplazarDisenioDTO } from './dto/ReemplazarDisenioDTO';

// Diseños de cada grupo (prendas, bandera, extras): coordina el archivo en Storage
// con su fila en documentos, igual que ContratosService con las firmas.
@Injectable()
export class DiseniosService
{
    constructor(
        private storageService: StorageService,
        private documentosService: DocumentosService,
    ) {}

    async crearUrlSubida(idGrupo: number)
    {
        return await this.storageService.crearUrlSubidaDiseno(idGrupo);
    }

    // El front ya subió el PDF directo a Storage: verificamos que esté y lo registramos en documentos.
    async confirmar(dto: SubirDisenioDTO)
    {
        await this.validarArchivoSubido(dto.ruta, dto.idGrupo);

        const [idDocumento] = await this.documentosService.subirDocumento({
            id_grupo: dto.idGrupo,
            tipo: dto.tipo,
            archivo_url: dto.ruta,
        });

        return { idDocumento };
    }

    // Reemplaza el archivo de un diseño existente. El orden importa:
    // primero se apunta la fila al archivo nuevo y recién después se borra el viejo.
    async reemplazar(dto: ReemplazarDisenioDTO)
    {
        await this.validarArchivoSubido(dto.ruta, dto.idGrupo);

        const rutaAnterior = await this.documentosService.obtenerArchivoUrl(dto.idDocumento);

        if (!rutaAnterior?.startsWith(`${dto.idGrupo}/`))
        {
            throw new BadRequestException('El documento no corresponde a este grupo.');
        }

        await this.documentosService.actualizarArchivoUrl(dto.idDocumento, dto.ruta);
        await this.storageService.eliminarDiseno(rutaAnterior);

        return { idDocumento: dto.idDocumento };
    }

    private async validarArchivoSubido(ruta: string, idGrupo: number)
    {
        if (!ruta?.startsWith(`${idGrupo}/`))
        {
            throw new BadRequestException('La ruta no corresponde a este grupo.');
        }

        if (!(await this.storageService.existeDiseno(ruta)))
        {
            throw new BadRequestException('El archivo no se encuentra en Storage.');
        }
    }
}
