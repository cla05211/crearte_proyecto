import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { ClientesService } from 'src/clientes-service/clientes.service';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from 'src/supabase/supabase.service';

@Injectable()
export class ClientesAuthService
{
    constructor(private clientesService: ClientesService, private sb:SupabaseService){}

    async iniciarSesion(usuario: string, contraseña: string)
    {
        // .trim() defensivo: si la columna `usuario` en la tabla `clientes` quedó
        // tipada como char(n), Postgres devuelve el valor con espacios de relleno.
        // Lo ideal es corregir el tipo de columna a text/varchar; esto es solo
        // para que el login no se rompa mientras tanto.
        const usuarioNormalizado = usuario.trim();

        let cliente;
        try
        {
            cliente = await this.clientesService.obtenerClientePorNombreUsuario(usuarioNormalizado);
        }
        catch
        {
            throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas.' });
        }

        if (!cliente || !(await bcrypt.compare(contraseña, cliente.contrasena_hash)))
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

        return { token: tokenCrudo, cliente: { id: cliente.id, id_grupo: cliente.id_grupo, usuario: cliente.usuario } };
    }
}
