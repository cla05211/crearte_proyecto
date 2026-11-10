// Supabase (PostgREST) devuelve como máximo 1000 filas por consulta y corta en silencio.
// Para listados que tienen que venir completos (deudores, estadísticas), se pide de a bloques
// hasta que un bloque venga incompleto. La consulta tiene que tener un .order() estable (ej. por id)
// para que los bloques no se pisen.
const TAMANIO_BLOQUE = 1000;

type RespuestaSupabase<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export async function traerTodasLasFilas<T>(
    armarConsulta: (desde: number, hasta: number) => RespuestaSupabase<T>,
): Promise<T[]>
{
    const filas: T[] = [];

    for (let desde = 0; ; desde += TAMANIO_BLOQUE)
    {
        const { data, error } = await armarConsulta(desde, desde + TAMANIO_BLOQUE - 1);

        if (error)
        {
            throw new Error(error.message);
        }

        filas.push(...(data ?? []));

        if (!data || data.length < TAMANIO_BLOQUE)
        {
            return filas;
        }
    }
}
