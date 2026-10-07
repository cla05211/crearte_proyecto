import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Protege los endpoints que dispara pg_cron (no un usuario).
 * pg_net manda el header "x-cron-secret" y acá se compara con CRON_SECRET del .env.
 */
@Injectable()
export class CronSecretGuard implements CanActivate
{
    constructor(private readonly config: ConfigService) {}

    canActivate(context: ExecutionContext): boolean
    {
        const request = context.switchToHttp().getRequest();
        const secretRecibido = request.headers['x-cron-secret'];
        const secretEsperado = this.config.get<string>('CRON_SECRET');

        // Si falta la variable en el .env, se rechaza todo (mejor cerrado que abierto)
        if (!secretEsperado || secretRecibido !== secretEsperado)
        {
            throw new UnauthorizedException('Secret de cron inválido');
        }

        return true;
    }
}
