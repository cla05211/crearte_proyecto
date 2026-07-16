import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseService 
{
  supabase: SupabaseClient<any, "public", any>;
  supabaseAuth: SupabaseClient<any, "public", any>;

  constructor(private configService: ConfigService) 
  {
    const url = configService.get<string>('SUPABASE_URL');
    const serviceKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = configService.get<string>('SUPABASE_ANON_KEY')
    
    this.supabase = createClient(url!, serviceKey!, {
      auth: {
      autoRefreshToken: false,
      persistSession: false,
      },});

    this.supabaseAuth = createClient(url!, anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },});
  }
}