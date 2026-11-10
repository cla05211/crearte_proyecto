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
    if (!tokenCrudo) throw new UnauthorizedException('Formato de token inválido');

    const tokenHash = createHash('sha256').update(tokenCrudo).digest('hex');

    const { data, error } = await this.sb.supabase
      .from('sesiones_clientes')
      .select('*, clientes(*)')
      .eq('token_hash', tokenHash)
      .gt('expira_en', new Date().toISOString())
      .single();

    if (error || !data) throw new UnauthorizedException('Token inválido o expirado');

    // Si el pedido del colegio se canceló, el portal deja de estar disponible (también para sesiones ya abiertas)
    const { count } = await this.sb.supabase
      .from('pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('id_grupo', data.clientes!.id_grupo)
      .eq('estado_general', 'Cancelado');

    if (count) throw new UnauthorizedException({ code: 'PEDIDO_CANCELADO', message: 'El pedido de este colegio fue cancelado.' });

    request.cliente = data.clientes;
    return true;
  }
}