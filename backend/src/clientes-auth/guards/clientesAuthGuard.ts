import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { SupabaseService } from "src/supabase/supabase.service";

@Injectable()
export class ClienteAuthGuard implements CanActivate {

  constructor(private sb: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> 
  {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader) throw new UnauthorizedException('No se proporcionó token de acceso');

    const tokenCrudo = authHeader.split(' ')[1];
    const tokenHash = createHash('sha256').update(tokenCrudo).digest('hex');

    const { data, error } = await this.sb.supabase
      .from('sesiones_clientes')
      .select('*, clientes(*)')
      .eq('token_hash', tokenHash)
      .gt('expira_en', new Date().toISOString())
      .single();

    if (error || !data) throw new UnauthorizedException('Token inválido o expirado');

    request.cliente = data.clientes;
    return true;
  }
}