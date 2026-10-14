import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { SubirArchivoStorage } from './dto/SubirArchivoStorage.dto';
import { ArchivoSubidoDTO } from './dto/ArchivoSubidoDTO';
import { randomUUID } from 'crypto';

// Tiene que coincidir con el nombre del bucket creado en Supabase
const BUCKET_DISENIOS = 'disenios';

@Injectable()
export class StorageService {
  constructor(private supabaseService: SupabaseService) {}

    async guardarImagen(dto: SubirArchivoStorage, archivo: ArchivoSubidoDTO):Promise<string>
    {
        if (!archivo) throw new BadRequestException('No se recibió ningún archivo.');

        const ruta = `${dto.carpetaGuardado}/${dto.nombreArchivo}`;

        const {data,error} = await this.supabaseService.supabase.storage
        .from("imagenes")
        .upload(ruta, archivo.buffer, { contentType: archivo.mimetype })

        if (error)
        {
            console.error("Error al subir la imagen a Supabase:", error.message);
            throw new Error(error.message);
        }

        return ruta;
    }

    async descargarArchivo(ruta: string): Promise<Buffer>
    {
        const { data, error } = await this.supabaseService.supabase.storage
        .from('imagenes')
        .download(ruta);

        if (error)
        {
            throw new Error(error.message);
        }

        return Buffer.from(await data.arrayBuffer());
    }

    async obtenerUrlArchivo(ruta: string): Promise<string> 
    {
        const { data, error } = await this.supabaseService.supabase.storage
        .from('imagenes')
        .createSignedUrl(ruta, 3600);

        if (error) 
        {
            throw new Error(error.message);
        }

        return data.signedUrl;
    }

    async crearUrlSubidaDiseno(idGrupo: number): Promise<{ ruta: string; signedUrl: string }>
    {
        const ruta = `${idGrupo}/${randomUUID()}.pdf`;

        const { data, error } = await this.supabaseService.supabase.storage
            .from(BUCKET_DISENIOS)
            .createSignedUploadUrl(ruta);

        if (error)
        {
            throw new InternalServerErrorException(error.message);
        }

        return { ruta, signedUrl: data.signedUrl };
    }

    async eliminarDiseno(ruta: string)
    {
        const { error } = await this.supabaseService.supabase.storage
            .from(BUCKET_DISENIOS)
            .remove([ruta]);

        if (error)
        {
            console.error('No se pudo borrar el diseño anterior:', error.message);
        }
    }

    async existeDiseno(ruta: string): Promise<boolean>
    {
        const [carpeta, nombre] = ruta.split('/');

        const { data, error } = await this.supabaseService.supabase.storage
            .from(BUCKET_DISENIOS)
            .list(carpeta, { search: nombre });

        if (error)
        {
            throw new InternalServerErrorException(error.message);
        }

        return data.some(archivo => archivo.name === nombre);
    }
}
