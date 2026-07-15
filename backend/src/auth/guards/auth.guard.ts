import {Injectable,CanActivate,ExecutionContext,UnauthorizedException,} from '@nestjs/common';
import { SupabaseService } from 'src/supabase/supabase.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private sb: SupabaseService, private usuariosService: UsuariosService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
        throw new UnauthorizedException('No se proporcionó token de acceso');
    }

    const token = authHeader.split(' ')[1]; 
    if (!token) {
        throw new UnauthorizedException('Formato de token inválido');
    }

    const { data, error } = await this.sb.supabase.auth.getUser(token);

    if (error || !data.user) {
        throw new UnauthorizedException('Token inválido o expirado');
    }

    // Agregamos usuario supabase a request
    request.user = data.user;
    request.usuario = await this.usuariosService.obtenerUsuarioPorIdAuth(data.user.id);
    return true;
    }
}