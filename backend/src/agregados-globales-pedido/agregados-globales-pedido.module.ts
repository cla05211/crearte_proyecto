import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { AgregadosGlobalesPedidoService } from './agregados-globales-pedido.service';

@Module({
  imports: [SupabaseModule],
  providers: [AgregadosGlobalesPedidoService],
  exports: [AgregadosGlobalesPedidoService],
})
export class AgregadosGlobalesPedidoModule {}
