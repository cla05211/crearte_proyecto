import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PermisosModule } from '../permisos/permisos.module';
import { GestionPedidosModule } from '../gestion-pedidos/gestion-pedidos.module';
import { StorageModule } from '../storage/storage.module';
import { ReportesModule } from '../reportes/reportes.module';
import { UsuariosService } from '../usuarios/usuarios.service';
import { GruposService } from '../grupos/grupos.service';
import { CuotasService } from '../cuotas/cuotas.service';
import { DocumentosService } from '../documentos/documentos.service';
import { ContratosController } from './contratos.controller';
import { ContratosService } from './contratos.service';

@Module({
    imports: [SupabaseModule, PermisosModule, GestionPedidosModule, StorageModule, ReportesModule],
    controllers: [ContratosController],
    providers: [ContratosService, UsuariosService, GruposService, CuotasService, DocumentosService],
    exports: [ContratosService],
})
export class ContratosModule {}
