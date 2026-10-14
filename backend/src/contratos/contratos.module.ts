import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { PermisosModule } from 'src/permisos/permisos.module';
import { GestionPedidosModule } from 'src/gestion-pedidos/gestion-pedidos.module';
import { StorageModule } from 'src/storage/storage.module';
import { ReportesModule } from 'src/reportes/reportes.module';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { GruposService } from 'src/grupos/grupos.service';
import { CuotasService } from 'src/cuotas/cuotas.service';
import { DocumentosService } from 'src/documentos/documentos.service';
import { ContratosController } from './contratos.controller';
import { ContratosService } from './contratos.service';

@Module({
    imports: [SupabaseModule, PermisosModule, GestionPedidosModule, StorageModule, ReportesModule],
    controllers: [ContratosController],
    providers: [ContratosService, UsuariosService, GruposService, CuotasService, DocumentosService],
    exports: [ContratosService],
})
export class ContratosModule {}
