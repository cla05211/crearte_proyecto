import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [AuthModule]
})
export class AuthModule {}
