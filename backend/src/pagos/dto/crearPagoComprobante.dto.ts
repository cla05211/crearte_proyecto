// Pago por transferencia que carga un empleado desde Clientes > Administrativo > Cuenta corriente.
// El comprobante ya se subió directo a Supabase: acá llega solo su ruta.
export class CrearPagoComprobanteDTO
{
    id_pedido!: number;
    monto!: number;
    fecha!: string;
    banco!: string;
    entidad_pago!: string;
    nroTransferencia!: string;
    ruta!: string;
}

export class SolicitarSubidaComprobanteDTO
{
    id_pedido!: number;
    nombreArchivo!: string;
    mimetype!: string;
}
