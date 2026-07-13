import { Injectable, Inject } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';
import { GuardarUsuarioDTO } from './dto/guardarUsuario.dto';


@Injectable()
export class UsuariosService {
    constructor(private sb: SupabaseService){}

    async guardarUsuario(dto: GuardarUsuarioDTO)
    {
         console.log('DTO recibido:', dto);
            const resultado = await this.sb.supabase
        .from('usuarios')
        .insert(dto);

    console.log('Resultado Supabase:', resultado);

    return resultado;
    }
}
