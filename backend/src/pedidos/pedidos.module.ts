import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
    imports: [PedidosModule, SupabaseModule],
    providers: [PedidosService],
    exports: [PedidosService],
})
export class PedidosModule {}
