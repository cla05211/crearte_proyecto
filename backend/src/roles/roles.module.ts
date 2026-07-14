import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { RolesService } from './roles.service';

@Module({
    imports: [SupabaseModule],
    controllers: [RolesController],
    providers: [RolesService]
})
export class RolesModule {}
