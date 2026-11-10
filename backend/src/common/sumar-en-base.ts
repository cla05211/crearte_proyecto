import { SupabaseClient } from '@supabase/supabase-js';

// Llama a una función SQL que devuelve un número (ver migración 20261110130000_sumas_en_sql.sql).
// Va con SupabaseClient<any> porque estas funciones todavía no están en los tipos generados (src/types/supabase.ts).
export async function sumarEnBase(sb: SupabaseClient<any>, funcion: string, args: Record<string, unknown>): Promise<number>
{
    const { data, error } = await sb.rpc(funcion, args);

    if (error)
    {
        throw new Error(error.message);
    }

    return Number(data ?? 0);
}
