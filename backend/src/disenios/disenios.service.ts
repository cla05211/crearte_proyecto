import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { ResumenTallesService } from 'src/resumen-talles/resumen-talles.service';
import { PedidosService } from 'src/pedidos/pedidos.service';
import { SubirDisenioDTO } from './dto/SubirDisenioDTO';
import { ReemplazarDisenioDTO } from './dto/ReemplazarDisenioDTO';
import { DisenioResponseDTO, DiseniosGrupoResponseDTO } from './dto/DisenioResponseDTO';

// Todos los diseños se guardan en documentos con tipo 'Disenio ...'
export const PREFIJO_TIPO_DISENIO = 'Disenio ';
const LARGO_MAXIMO_NOMBRE = 60;
const ESTADO_TALLES_CONFIRMADO = 'Confirmado';

// Diseños de cada grupo (prendas, bandera, extras): coordina el archivo en Storage
// con su fila en documentos, igual que ContratosService con las firmas.
@Injectable()
export class DiseniosService
{
    constructor(
        private storageService: StorageService,
        private documentosService: DocumentosService,
        private resumenTallesService: ResumenTallesService,
        private pedidosService: PedidosService,
    ) {}

    // Diseños guardados del grupo + si el pedido lleva bandera (para mostrar o no "Diseño Bandera")
    // + si los talles ya están confirmados (si no, el resumen se muestra como pendiente)
    async listar(idGrupo: number): Promise<DiseniosGrupoResponseDTO>
    {
        const idPedido = await this.pedidosService.obtenerIdPedidoGrupo(idGrupo);

        const [documentos, tieneBandera, estadoTalles] = await Promise.all([
            this.documentosService.obtenerDocumentosPorPrefijoTipo(idGrupo, PREFIJO_TIPO_DISENIO),
            this.pedidosService.determinarBandera(idPedido),
            this.pedidosService.obtenerEstadoTalles(idPedido),
        ]);

        const disenios: DisenioResponseDTO[] = documentos.map(d => ({ id: d.id, tipo: d.tipo!, created_at: d.created_at }));

        return { disenios, tieneBandera, tallesConfirmados: estadoTalles === ESTADO_TALLES_CONFIRMADO };
    }

    async crearUrlSubida(idGrupo: number)
    {
        return await this.storageService.crearUrlSubidaDiseno(idGrupo);
    }

    // El front ya subió el PDF directo a Storage: verificamos que esté y lo registramos en documentos.
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

    // Reemplaza el archivo de un diseño existente. El orden importa:
    // primero se apunta la fila al archivo nuevo y recién después se borra el viejo.
    async reemplazar(dto: ReemplazarDisenioDTO)
    {
        await this.validarArchivoSubido(dto.ruta, dto.idGrupo);

        const rutaAnterior = await this.obtenerRutaDelGrupo(dto.idGrupo, dto.idDocumento);

        await this.documentosService.actualizarArchivoUrl(dto.idDocumento, dto.ruta);
        await this.storageService.eliminarDiseno(rutaAnterior);

        return { idDocumento: dto.idDocumento };
    }

    async crearUrlDescarga(idGrupo: number, idDocumento: number, nombreArchivo: string)
    {
        const ruta = await this.obtenerRutaDelGrupo(idGrupo, idDocumento);
        const nombre = `${this.nombreArchivoSeguro(nombreArchivo)}.pdf`;

        return { url: await this.storageService.crearUrlDescargaDiseno(ruta, nombre) };
    }

    async generarResumenTalles(idGrupo: number)
    {
        const idPedido = await this.pedidosService.obtenerIdPedidoGrupo(idGrupo);

        // El botón no se muestra si están pendientes, pero se corta acá también por si llaman al endpoint directo
        if (await this.pedidosService.obtenerEstadoTalles(idPedido) !== ESTADO_TALLES_CONFIRMADO)
        {
            throw new ConflictException('Los talles todavía no fueron confirmados por el cliente.');
        }

        return await this.resumenTallesService.generarPdf(idGrupo);
    }

    // Supabase no codifica bien los caracteres especiales en el nombre de descarga
    // ('Diseño' llegaba como 'Dise%C3%B1o'), así que se pasa a ASCII: 'Diseño Prendas' -> 'Diseno Prendas'
    private nombreArchivoSeguro(nombre: string): string
    {
        const limpio = nombre
            .replace(/\.pdf$/i, '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   // saca tildes y la virgulilla de la ñ
            .replace(/[^a-zA-Z0-9 _-]/g, '')     // saca cualquier otro caracter raro
            .replace(/\s+/g, ' ')
            .trim();

        return limpio || 'disenio';
    }

    // Normaliza el tipo ('Disenio ' + nombre) y corta los inválidos
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

    // Trae la ruta del documento y confirma que pertenece al grupo (todas las rutas empiezan con 'idGrupo/')
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
}
