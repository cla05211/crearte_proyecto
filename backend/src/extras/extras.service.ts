import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService } from 'src/storage/storage.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { ConfirmarExtraDTO, ExtraResponseDTO, PedirUrlSubidaExtraDTO } from './dto/extras.dto';

// Archivos internos del colegio (capturas, PDFs de resguardo). Solo los ven los empleados:
// el portal de clientes no tiene ningún endpoint que liste o descargue documentos de este tipo.
export const TIPO_EXTRA = 'Extra';

const FORMATOS_EXTRA: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
};
const LARGO_MAXIMO_NOMBRE = 80;
// En la ruta se guarda el nombre original después de este separador: {idGrupo}/{uuid}__{nombre}.{ext}
const SEPARADOR_NOMBRE = '__';

@Injectable()
export class ExtrasService
{
    constructor(
        private storageService: StorageService,
        private documentosService: DocumentosService,
    ) {}

    async listar(idGrupo: number): Promise<ExtraResponseDTO[]>
    {
        const documentos = await this.documentosService.obtenerDocumentosPorPrefijoTipo(idGrupo, TIPO_EXTRA);

        return documentos
            .filter(d => d.tipo === TIPO_EXTRA)
            .map(d => ({
                id: d.id,
                nombre: this.nombreDesdeRuta(d.archivo_url ?? ''),
                formato: (d.archivo_url ?? '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'imagen',
                created_at: d.created_at,
            }));
    }

    async crearUrlSubida(dto: PedirUrlSubidaExtraDTO)
    {
        const extension = FORMATOS_EXTRA[dto.tipoArchivo];

        if (!extension)
        {
            throw new BadRequestException('Solo se pueden subir imágenes (JPG, PNG, WEBP) o PDF.');
        }

        const ruta = `${dto.idGrupo}/${randomUUID()}${SEPARADOR_NOMBRE}${this.nombreSeguro(dto.nombreArchivo)}.${extension}`;
        const signedUrl = await this.storageService.crearUrlSubidaExtra(ruta);

        return { ruta, signedUrl };
    }

    async confirmar(dto: ConfirmarExtraDTO)
    {
        if (!dto.ruta?.startsWith(`${dto.idGrupo}/`))
        {
            throw new BadRequestException('La ruta no corresponde a este grupo.');
        }

        if (!(await this.storageService.existeExtra(dto.ruta)))
        {
            throw new BadRequestException('El archivo no se encuentra en Storage.');
        }

        const [idDocumento] = await this.documentosService.subirDocumento({
            id_grupo: dto.idGrupo,
            tipo: TIPO_EXTRA,
            archivo_url: dto.ruta,
        });

        return { idDocumento };
    }

    async crearUrlDescarga(idGrupo: number, idDocumento: number)
    {
        const extra = await this.obtenerExtraDelGrupo(idGrupo, idDocumento);
        const ruta = extra.archivo_url!;
        const extension = ruta.split('.').pop();

        return { url: await this.storageService.crearUrlDescargaExtra(ruta, `${this.nombreDesdeRuta(ruta)}.${extension}`) };
    }

    async eliminar(idGrupo: number, idDocumento: number)
    {
        const extra = await this.obtenerExtraDelGrupo(idGrupo, idDocumento);

        await this.documentosService.eliminarDocumento(extra.id);
        if (extra.archivo_url) await this.storageService.eliminarExtra(extra.archivo_url);

        return { idDocumento };
    }

    private async obtenerExtraDelGrupo(idGrupo: number, idDocumento: number)
    {
        const extras = await this.documentosService.obtenerDocumentosPorPrefijoTipo(idGrupo, TIPO_EXTRA);
        const extra = extras.find(d => d.id === idDocumento && d.tipo === TIPO_EXTRA);

        if (!extra)
        {
            throw new NotFoundException('El archivo no existe o no pertenece a este colegio.');
        }

        return extra;
    }

    private nombreDesdeRuta(ruta: string): string
    {
        const archivo = ruta.split('/').pop() ?? '';
        const sinUuid = archivo.includes(SEPARADOR_NOMBRE) ? archivo.slice(archivo.indexOf(SEPARADOR_NOMBRE) + SEPARADOR_NOMBRE.length) : archivo;
        return sinUuid.replace(/\.[^.]+$/, '') || 'extra';
    }

    // Sin tildes ni caracteres raros (Storage no los acepta en la ruta) y sin la extensión
    private nombreSeguro(nombre: string): string
    {
        const limpio = (nombre ?? '')
            .replace(/\.[^.]+$/, '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9 _-]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, LARGO_MAXIMO_NOMBRE)
            .replace(/^-+|-+$/g, '');

        return limpio || 'extra';
    }
}
