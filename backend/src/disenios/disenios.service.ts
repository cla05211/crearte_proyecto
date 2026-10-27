import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { ResumenTallesService } from 'src/resumen-talles/resumen-talles.service';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { SubirDisenioDTO } from './dto/SubirDisenioDTO';
import { ReemplazarDisenioDTO } from './dto/ReemplazarDisenioDTO';
import { DisenioResponseDTO, DiseniosGrupoResponseDTO } from './dto/DisenioResponseDTO';
import { ArchivoSubidoDTO } from 'src/storage/dto/ArchivoSubidoDTO';

export const PREFIJO_TIPO_DISENIO = 'Disenio ';
// El boceto firmado (JPG que el cliente devuelve por WhatsApp) se guarda en documentos como 'Firma ' + tipo del diseño
const PREFIJO_TIPO_FIRMA = 'Firma ';
// Subir el firmado de este diseño es lo que aprueba el boceto del pedido
const TIPO_DISENIO_PRENDAS = 'Disenio Prendas';
const FORMATOS_FIRMADO: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const CARPETA_FIRMADOS = 'firmas-disenio';
const LARGO_MAXIMO_NOMBRE = 60;
const ESTADO_TALLES_CONFIRMADO = 'Confirmado';

@Injectable()
export class DiseniosService
{
    constructor(
        private storageService: StorageService,
        private documentosService: DocumentosService,
        private resumenTallesService: ResumenTallesService,
        private pedidosService: PedidosService,
    ) {}

    async listar(idGrupo: number): Promise<DiseniosGrupoResponseDTO>
    {
        const idPedido = await this.pedidosService.obtenerIdPedidoGrupo(idGrupo);

        const [documentos, firmas, tieneBandera, estadoTalles] = await Promise.all([
            this.documentosService.obtenerDocumentosPorPrefijoTipo(idGrupo, PREFIJO_TIPO_DISENIO),
            this.documentosService.obtenerDocumentosPorPrefijoTipo(idGrupo, PREFIJO_TIPO_FIRMA + PREFIJO_TIPO_DISENIO),
            this.pedidosService.determinarBandera(idPedido),
            this.pedidosService.obtenerEstadoTalles(idPedido),
        ]);

        const tiposFirmados = new Set(firmas.map(f => f.tipo));

        const disenios: DisenioResponseDTO[] = documentos.map(d => ({
            id: d.id,
            tipo: d.tipo!,
            created_at: d.created_at,
            firmado: tiposFirmados.has(PREFIJO_TIPO_FIRMA + d.tipo),
        }));

        return { disenios, tieneBandera, tallesConfirmados: estadoTalles === ESTADO_TALLES_CONFIRMADO };
    }

    async crearUrlSubida(idGrupo: number)
    {
        return await this.storageService.crearUrlSubidaDiseno(idGrupo);
    }

    async confirmar(dto: SubirDisenioDTO)
    {
        const tipo = this.validarTipo(dto.tipo);
        await this.validarArchivoSubido(dto.ruta, dto.idGrupo);

        if (await this.documentosService.obtenerDocumentoPorTipo(dto.idGrupo, tipo))
        {
            throw new ConflictException(`Ya existe un diseño "${tipo}" para este grupo.`);
        }

        const [idDocumento] = await this.documentosService.subirDocumento({
            id_grupo: dto.idGrupo,
            tipo,
            archivo_url: dto.ruta,
        });

        return { idDocumento };
    }

    async reemplazar(dto: ReemplazarDisenioDTO)
    {
        await this.validarArchivoSubido(dto.ruta, dto.idGrupo);

        const disenio = await this.obtenerDisenioDelGrupo(dto.idGrupo, dto.idDocumento);

        if (await this.documentosService.obtenerDocumentoPorTipo(dto.idGrupo, PREFIJO_TIPO_FIRMA + disenio.tipo))
        {
            throw new ConflictException('El diseño ya tiene el firmado cargado y no se puede reemplazar.');
        }

        await this.documentosService.actualizarArchivoUrl(dto.idDocumento, dto.ruta);
        await this.storageService.eliminarDiseno(disenio.archivo_url!);

        return { idDocumento: dto.idDocumento };
    }

    async crearUrlDescarga(idGrupo: number, idDocumento: number, nombreArchivo: string)
    {
        // Solo diseños del grupo: este endpoint también lo usa el portal de clientes,
        // que no tiene que poder descargar otros documentos (ej: los Extra internos)
        await this.obtenerDisenioDelGrupo(idGrupo, idDocumento);
        const ruta = await this.obtenerRutaDelGrupo(idGrupo, idDocumento);
        const nombre = `${this.nombreArchivoSeguro(nombreArchivo)}.pdf`;

        return { url: await this.storageService.crearUrlDescargaDiseno(ruta, nombre) };
    }

    // URL para descargar el boceto firmado de un diseño ('Firma ' + tipo)
    async crearUrlDescargaFirmado(idGrupo: number, idDocumento: number, nombreArchivo: string)
    {
        const disenio = await this.obtenerDisenioDelGrupo(idGrupo, idDocumento);
        const firmado = await this.documentosService.obtenerDocumentoPorTipo(idGrupo, PREFIJO_TIPO_FIRMA + disenio.tipo);

        if (!firmado?.archivo_url)
        {
            throw new NotFoundException('Este diseño todavía no tiene el firmado cargado.');
        }

        // La extensión sale del archivo guardado (los firmados viejos son PNG, los nuevos JPG)
        const extension = firmado.archivo_url.split('.').pop() || 'jpg';
        const nombre = `${this.nombreArchivoSeguro(nombreArchivo)}.${extension}`;

        return { url: await this.storageService.obtenerUrlArchivo(firmado.archivo_url, nombre) };
    }

    async generarResumenTalles(idGrupo: number)
    {
        const idPedido = await this.pedidosService.obtenerIdPedidoGrupo(idGrupo);

        if (await this.pedidosService.obtenerEstadoTalles(idPedido) !== ESTADO_TALLES_CONFIRMADO)
        {
            throw new ConflictException('Los talles todavía no fueron confirmados por el cliente.');
        }

        return await this.resumenTallesService.generarPdf(idGrupo);
    }

    private nombreArchivoSeguro(nombre: string): string
    {
        const limpio = nombre
            .replace(/\.pdf$/i, '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   
            .replace(/[^a-zA-Z0-9 _-]/g, '')     
            .replace(/\s+/g, ' ')
            .trim();

        return limpio || 'disenio';
    }

    private validarTipo(tipo: string): string
    {
        const limpio = (tipo ?? '').trim().replace(/\s+/g, ' ');
        const nombre = limpio.slice(PREFIJO_TIPO_DISENIO.length).trim();

        if (!limpio.startsWith(PREFIJO_TIPO_DISENIO) || !nombre)
        {
            throw new BadRequestException('El diseño tiene que tener un nombre.');
        }

        if (nombre.length > LARGO_MAXIMO_NOMBRE)
        {
            throw new BadRequestException(`El nombre del diseño no puede superar los ${LARGO_MAXIMO_NOMBRE} caracteres.`);
        }

        return limpio;
    }

    private async obtenerRutaDelGrupo(idGrupo: number, idDocumento: number): Promise<string>
    {
        const ruta = await this.documentosService.obtenerArchivoUrl(idDocumento);

        if (!ruta?.startsWith(`${idGrupo}/`))
        {
            throw new BadRequestException('El documento no corresponde a este grupo.');
        }

        return ruta;
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

    private async obtenerDisenioDelGrupo(idGrupo: number, idDocumento: number)
    {
        const disenios = await this.documentosService.obtenerDocumentosPorPrefijoTipo(idGrupo, PREFIJO_TIPO_DISENIO);
        const disenio = disenios.find(d => d.id === idDocumento);

        if (!disenio)
        {
            throw new ForbiddenException('El diseño no pertenece a este grupo.');
        }

        return disenio;
    }

    // El empleado sube el boceto firmado (JPG) que el cliente mandó por WhatsApp.
    // Si ya había uno, se reemplaza (por si se subió el archivo equivocado).
    async subirFirmado(idGrupo: number, idDocumento: number, archivo: ArchivoSubidoDTO)
    {
        const extension = archivo ? FORMATOS_FIRMADO[archivo.mimetype] : undefined;

        if (!extension)
        {
            throw new BadRequestException('Falta el archivo o no es una imagen JPG.');
        }

        const disenio = await this.obtenerDisenioDelGrupo(idGrupo, idDocumento);
        const tipoFirmado = PREFIJO_TIPO_FIRMA + disenio.tipo;

        const pedido = await this.pedidosService.obtenerPedidoGrupo(idGrupo);
        const idPedido = pedido.id;

        const rutaFirmado = await this.storageService.guardarImagen(
            {
                pedidoId: idPedido.toString(),
                nombreArchivo: `firmado-${idPedido}-${idDocumento}-${Date.now()}.${extension}`,
                carpetaGuardado: CARPETA_FIRMADOS,
            },
            archivo,
        );

        const existente = await this.documentosService.obtenerDocumentoPorTipo(idGrupo, tipoFirmado);
        let idFirmado: number;

        if (existente)
        {
            await this.documentosService.actualizarArchivoUrl(existente.id, rutaFirmado);
            if (existente.archivo_url) await this.storageService.eliminarImagen(existente.archivo_url);
            idFirmado = existente.id;
        }
        else
        {
            [idFirmado] = await this.documentosService.subirDocumento({
                id_grupo: idGrupo,
                tipo: tipoFirmado,
                archivo_url: rutaFirmado,
            });
        }

        // El firmado del diseño de prendas aprueba el boceto con la fecha de hoy (igual que talles al confirmarse).
        // Si ya tenía fecha no se toca: una vez puesta queda fija.
        if (disenio.tipo === TIPO_DISENIO_PRENDAS && !pedido.fecha_aprobacion_boceto)
        {
            const fechaHoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
            await this.pedidosService.modificarFechaAprobacionDisenio(fechaHoy, idPedido);
        }

        return { idDocumento: idFirmado };
    }
}
