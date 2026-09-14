import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { ClientesService } from 'src/clientes-service/clientes.service';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class ClientesAuthService 
{
    constructor(private clientesService: ClientesService, private sb:SupabaseService){}

    async iniciarSesion(nombreUsuario: string, contraseña: string) 
    {
        const contrasena_hash = await bcrypt.hash(contraseña, 10);
        const cliente = await this.clientesService.obtenerClientePorNombreUsuario(nombreUsuario);
        if (!cliente || !(await bcrypt.compare(contrasena_hash, cliente.contrasena_hash))) 
        {
            throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas.' });
        }

        const tokenCrudo = randomBytes(32).toString('hex'); 
        const tokenHash = createHash('sha256').update(tokenCrudo).digest('hex'); 

        await this.sb.supabase.from('sesiones_clientes').insert({
            id_cliente: cliente.id,
            token_hash: tokenHash,
            expira_en: (new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)).toISOString(), 
        });

        return { token: tokenCrudo, cliente: { id: cliente.id, id_grupo:cliente.id_grupo } };
    }
}
