import { Module } from '@nestjs/common';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
    imports:[SupabaseModule],
    providers: []
})
export class PrendasPedidoTallesModule {}
