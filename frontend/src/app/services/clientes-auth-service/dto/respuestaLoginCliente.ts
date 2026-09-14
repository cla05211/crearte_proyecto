export interface Cliente
{
    id: number;
    id_grupo: number;
    usuario: string;
}

export interface respuestaLoginCliente
{
    token: string;
    cliente: Cliente;
}
