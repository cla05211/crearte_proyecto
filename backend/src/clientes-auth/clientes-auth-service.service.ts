import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { ClientesService } from 'src/clientes-service/clientes.service';
import * as bcrypt from 'bcrypt';
import { SupabaseService } from 'src/supabase/supabase.service';

// Cuánto dura el link para crear la contraseña desde que se genera.
const DIAS_VIGENCIA_TOKEN_ACTIVACION = 7;

// Mismas reglas que el formulario de login de clientes: si se permitiera algo
// distinto acá, el cliente podría crear una contraseña con la que después no
// puede iniciar sesión.
const LARGO_MINIMO_CONTRASENA = 8;
const PATRON_CONTRASENA = /^[A-Za-z0-9Ññ]+$/;

const hashearToken = (tokenCrudo: string) => createHash('sha256').update(tokenCrudo).digest('hex');

@Injectable()
export class ClientesAuthService
{
    constructor(private clientesService: ClientesService, private sb: SupabaseService, private config: ConfigService){}

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

        // El cliente existe pero todavía no entró al link para crear su contraseña.
        if (cliente && !cliente.contrasena_hash)
        {
            throw new UnauthorizedException({ code: 'CUENTA_NO_ACTIVADA', message: 'La cuenta todavía no fue activada.' });
        }

        if (!cliente || !(await bcrypt.compare(contraseña, cliente.contrasena_hash!)))
        {
            throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas.' });
        }

        const tokenCrudo = randomBytes(32).toString('hex');
        const tokenHash = hashearToken(tokenCrudo);

        await this.sb.supabase.from('sesiones_clientes').insert({
            id_cliente: cliente.id,
            token_hash: tokenHash,
            expira_en: (new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)).toISOString(),
        });

        return { token: tokenCrudo, cliente: { id: cliente.id, id_grupo: cliente.id_grupo, usuario: cliente.usuario } };
    }

    /**
     * Genera un link de un solo uso para que el cliente del grupo cree (o vuelva a crear) su contraseña.
     * Cada llamada invalida el link anterior. Pensado para usarse al enviar el WhatsApp de acceso
     * a la plataforma, y también para reenviar el link o "olvidé mi contraseña".
     * @returns el usuario, el token crudo (va en el botón de WhatsApp) y el link completo
     */
    async generarLinkActivacion(idGrupo: number)
    {
        const tokenCrudo = randomBytes(32).toString('hex');
        const expira = new Date(Date.now() + 1000 * 60 * 60 * 24 * DIAS_VIGENCIA_TOKEN_ACTIVACION);

        const { data, error } = await this.sb.supabase
            .from('clientes')
            .update({ token_activacion_hash: hashearToken(tokenCrudo), token_activacion_expira: expira.toISOString() })
            .eq('id_grupo', idGrupo)
            .select('usuario')
            .maybeSingle();

        if (error)
        {
            throw new InternalServerErrorException(error.message);
        }
        if (!data)
        {
            throw new NotFoundException({ code: 'CLIENTE_NO_ENCONTRADO', message: 'El grupo no tiene un cliente asociado.' });
        }

        const frontendUrl = this.config.get<string>('FRONTEND_URL');

        return {
            usuario: data.usuario.trim(),
            token: tokenCrudo,
            link: `${frontendUrl}/crear-contrasena/${tokenCrudo}`,
            expira: expira.toISOString(),
        };
    }

    /**
     * Verifica que el link sea válido antes de mostrar el formulario.
     * @returns el usuario, para mostrarle al cliente con qué usuario va a ingresar
     */
    async validarTokenActivacion(tokenCrudo: string)
    {
        const cliente = await this.buscarClientePorTokenActivacion(tokenCrudo);
        return { usuario: cliente.usuario.trim() };
    }

    async crearContrasena(tokenCrudo: string, contraseña: string)
    {
        if (!contraseña || contraseña.length < LARGO_MINIMO_CONTRASENA || !PATRON_CONTRASENA.test(contraseña))
        {
            throw new BadRequestException({
                code: 'CONTRASENA_INVALIDA',
                message: `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres y solo letras o números.`,
            });
        }

        const cliente = await this.buscarClientePorTokenActivacion(tokenCrudo);
        const contrasenaHash = await bcrypt.hash(contraseña, 10);

        // Se guarda la contraseña y se borra el token en el mismo update: el link queda usado.
        // El .eq() sobre el token evita que dos envíos simultáneos del mismo link pisen la contraseña.
        const { data, error } = await this.sb.supabase
            .from('clientes')
            .update({ contrasena_hash: contrasenaHash, token_activacion_hash: null, token_activacion_expira: null })
            .eq('id', cliente.id)
            .eq('token_activacion_hash', hashearToken(tokenCrudo))
            .select('id');

        if (error)
        {
            throw new InternalServerErrorException(error.message);
        }
        if (!data?.length)
        {
            throw new BadRequestException({ code: 'TOKEN_INVALIDO', message: 'El link no es válido o ya fue usado.' });
        }

        // Si es un cambio de contraseña (link reenviado), se cierran las sesiones abiertas.
        await this.sb.supabase.from('sesiones_clientes').delete().eq('id_cliente', cliente.id);

        return { usuario: cliente.usuario.trim() };
    }

    private async buscarClientePorTokenActivacion(tokenCrudo: string)
    {
        const { data, error } = await this.sb.supabase
            .from('clientes')
            .select('id, usuario, token_activacion_expira')
            .eq('token_activacion_hash', hashearToken(tokenCrudo ?? ''))
            .maybeSingle();

        if (error)
        {
            throw new InternalServerErrorException(error.message);
        }
        if (!data)
        {
            throw new BadRequestException({ code: 'TOKEN_INVALIDO', message: 'El link no es válido o ya fue usado.' });
        }
        if (!data.token_activacion_expira || new Date(data.token_activacion_expira) < new Date())
        {
            throw new BadRequestException({ code: 'TOKEN_VENCIDO', message: 'El link venció.' });
        }

        return data;
    }
}
