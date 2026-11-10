import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { AuthGuard } from './auth.guard';
import { ClienteAuthGuard } from 'src/clientes-auth/guards/clientesAuthGuard';

// Para endpoints que usan tanto empleados como clientes del portal (ej. OCR de comprobantes).
// Los tokens de staff son JWT de Supabase (tienen puntos); los de cliente son un hex opaco.
@Injectable()
export class StaffOClienteGuard implements CanActivate
{
    private readonly staff: AuthGuard;
    private readonly cliente: ClienteAuthGuard;

    constructor(sb: SupabaseService, usuariosService: UsuariosService)
    {
        this.staff = new AuthGuard(sb, usuariosService);
        this.cliente = new ClienteAuthGuard(sb);
    }

    async canActivate(context: ExecutionContext): Promise<boolean>
    {
        const authHeader: string | undefined = context.switchToHttp().getRequest().headers['authorization'];
        const token = authHeader?.split(' ')[1];

        if (!token)
        {
            throw new UnauthorizedException('No se proporcionó token de acceso');
        }

        return token.includes('.') ? this.staff.canActivate(context) : this.cliente.canActivate(context);
    }
}
