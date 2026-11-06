export interface Cliente
{
    id: number;
    id_grupo: number;
    usuario: string;
    // Nombre del colegio (para la barra del portal)
    colegio: string | null;
}

export interface respuestaLoginCliente
{
    token: string;
    cliente: Cliente;
}
