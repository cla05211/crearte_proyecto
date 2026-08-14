const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DIECIS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const DECENAS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertirGrupo(n: number): string
{
    if (n === 0) return '';
    if (n === 100) return 'CIEN';

    let texto = '';
    const centena = Math.floor(n / 100);
    const resto = n % 100;

    if (centena > 0) texto += CENTENAS[centena] + ' ';

    if (resto >= 10 && resto < 20)
    {
        texto += DIECIS[resto - 10];
    }
    else
    {
        const decena = Math.floor(resto / 10);
        const unidad = resto % 10;

        if (decena === 2 && unidad > 0)
        {
            texto += 'VEINTI' + UNIDADES[unidad].toLowerCase().replace(/^./, c => c.toUpperCase());
            texto = texto.toUpperCase();
        }
        else
        {
            if (decena > 0) texto += DECENAS[decena];
            if (decena > 0 && unidad > 0) texto += ' Y ';
            if (unidad > 0) texto += UNIDADES[unidad];
        }
    }

    return texto.trim();
}


export function numeroALetras(monto: number): string
{
    const parteEntera = Math.floor(Math.abs(monto));
    const parteDecimal = Math.round((Math.abs(monto) - parteEntera) * 100);

    if (parteEntera === 0)
    {
        return `CERO PESOS CON ${String(parteDecimal).padStart(2, '0')}/100`;
    }

    const millones = Math.floor(parteEntera / 1000000);
    const miles = Math.floor((parteEntera % 1000000) / 1000);
    const centenas = parteEntera % 1000;

    let texto = '';

    if (millones > 0)
    {
        texto += (millones === 1 ? 'UN MILLON' : `${convertirGrupo(millones)} MILLONES`) + ' ';
    }

    if (miles > 0)
    {
        texto += (miles === 1 ? 'MIL' : `${convertirGrupo(miles)} MIL`) + ' ';
    }

    if (centenas > 0)
    {
        texto += convertirGrupo(centenas);
    }

    texto = texto.trim();

    return `${texto} PESOS CON ${String(parteDecimal).padStart(2, '0')}/100`;
}