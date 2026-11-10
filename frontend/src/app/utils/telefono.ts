// Teléfono argentino para WhatsApp: código de área + número, 10 dígitos, sin 0 adelante ni 15.
// Ej. válidos: 11 2345-6789 · 221 412-3456 · 2944 12-3456
// Ej. inválidos: 011 15 2345-6789 (0 y 15) · 15 2345-6789 (falta el código de área)
export const soloDigitos = (telefono: string | null | undefined): string => (telefono ?? '').replace(/\D/g, '');

export const telefonoValido = (telefono: string | null | undefined): boolean =>
{
    const digitos = soloDigitos(telefono);
    return digitos.length === 10 && !digitos.startsWith('0') && !digitos.startsWith('15');
};
