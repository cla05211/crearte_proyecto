import { Injectable } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { ClienteResponseDTO } from './dto/clienteResponse.dto';

@Injectable()
export class ClientesService
{
    constructor(private sb: SupabaseService){}

    async obtenerClientePorNombreUsuario(usuario:string): Promise<ClienteResponseDTO>
    {
        const { data, error } = await this.sb.supabase
            .from('clientes')
            .select(`*`)
            .eq('usuario', usuario)
            .single();

        if (error) 
        {
            throw new Error(error.message);
        }

        return data as ClienteResponseDTO;        
    }
}
