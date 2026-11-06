// Pago por transferencia que carga un empleado desde Clientes > Administrativo > Cuenta corriente.
// Llega como multipart (junto con el archivo 'comprobante'), así que todo viene como string.
export class CrearPagoComprobanteDTO
{
    id_pedido!: string;
    monto!: string;
    fecha!: string;
    banco!: string;
    entidad_pago!: string;
    nroTransferencia!: string;
}
