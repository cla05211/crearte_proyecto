import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { Database } from '../types/supabase';

@Injectable()
export class SupabaseService 
{
  supabase: SupabaseClient<Database>;
  supabaseAuth: SupabaseClient<Database>;

  constructor(private configService: ConfigService) 
  {
    const url = configService.get<string>('SUPABASE_URL');
    const serviceKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = configService.get<string>('SUPABASE_ANON_KEY')
    
    this.supabase = createClient<Database>(url!, serviceKey!, {
      auth: {
      autoRefreshToken: false,
      persistSession: false,
      },});

    this.supabaseAuth = createClient<Database>(url!, anonKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },});
  }
}