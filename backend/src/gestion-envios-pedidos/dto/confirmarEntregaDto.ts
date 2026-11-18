export class confirmarEntregaDto
{
    fechaEntrega!: string; // 'YYYY-MM-DD'
    formaEntrega!: 'Envio' | 'Retiro oficina' | 'Comisionista';
}
