import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { SubirArchivoStorage } from './dto/SubirArchivoStorage.dto';
import { ArchivoSubidoDTO } from './dto/ArchivoSubidoDTO';

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
}
