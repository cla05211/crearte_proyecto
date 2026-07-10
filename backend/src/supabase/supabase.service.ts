import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService 
{
     supabase: SupabaseClient<any, "public", any>;
  constructor(private configService: ConfigService) 
        {
          this.supabase = createClient(configService.get<string>('SUPABASE_URL')!, configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,);
      }
}
