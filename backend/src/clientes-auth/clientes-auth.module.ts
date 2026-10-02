import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { PermisosModule } from 'src/permisos/permisos.module';
import { ClientesService } from 'src/clientes-service/clientes.service';
import { ClientesAuthController } from './clientes-auth.controller';
import { ClientesAuthService } from './clientes-auth-service.service';

@Module({
    // UsuariosModule y PermisosModule: los usan AuthGuard y PermisosGuard
    // en el endpoint de staff que genera el link de activación.
    // ConfigService no hace falta: ConfigModule es global.
    imports: [SupabaseModule, UsuariosModule, PermisosModule],
    controllers: [ClientesAuthController],
    providers: [ClientesAuthService, ClientesService],
    exports: [ClientesAuthService],
})
export class ClientesAuthModule {}
