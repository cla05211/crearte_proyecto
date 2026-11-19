// El comprobante ya se subió directo a Supabase (POST clientes-portal/pagos/url-subida): acá llega solo su ruta
export class CrearPagoClienteDto
{
    monto!: number;
    motivo!: string;
    fecha!: string;
    banco!: string;
    entidad_pago!: string;
    nroTransferencia!: string;
    ruta!: string;
}

export class SolicitarSubidaComprobanteClienteDto
{
    nombreArchivo!: string;
    mimetype!: string;
}
