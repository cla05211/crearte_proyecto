import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WatsappService 
{
    private readonly logger = new Logger(WatsappService.name);

    constructor(private readonly config: ConfigService) {}

    /**
     * @param telefono   número destinatario
     * @param plantilla  nombre plantilla en whatsApp 
     * @param variables  valores de {{1}}, {{2}}... en orden
     * @returns id del mensaje que vuelve
     */
    async enviarPlantilla(telefono: string, plantilla: string, variables: string[] = [], parametroBoton?: string): Promise<string>
    {
    const version = this.config.get<string>('WHATSAPP_API_VERSION');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const token = this.config.get<string>('WHATSAPP_TOKEN');

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

    // Se arma aparte para poder agregarle partes según lo que se mande
    const components: any[] = [];

    if (variables.length)
    {
        components.push({
            type: 'body',
            parameters: variables.map(v => ({ type: 'text', text: v })),
        });
    }

    if (parametroBoton)
    {
        components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',   
            parameters: [{ type: 'text', text: parametroBoton }],
        });
    }

    const destino = this.normalizarTelefono(telefono);

    const body = {
        messaging_product: 'whatsapp',
        to: destino,
        type: 'template',
        template: {
            name: plantilla,
            language: { code: 'es_AR' },
            components,   // <- ahora usa la variable
        },
    };

        const respuesta = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await respuesta.json();

        if (!respuesta.ok)
        {
            this.logger.error(`Error enviando "${plantilla}" a ${destino}: ${JSON.stringify(data.error)}`);
            throw new Error(data.error?.message ?? 'Error al enviar WhatsApp');
        }

        return data.messages[0].id;
    }

    private normalizarTelefono(telefono: string): string
    {
        let numero = telefono.replace(/\D/g, '');       
        if (numero.startsWith('0')) numero = numero.slice(1);  
        if (!numero.startsWith('54')) numero = '54' + numero;
        if (!numero.startsWith('549')) numero = '549' + numero.slice(2);

        // Solo para desarrollo: la lista de destinatarios del número de prueba de Meta
        // no reconoce los celulares argentinos con el 9 (549...), pero sí sin él (54...).
        // En producción esta variable NO va: el formato correcto es con 9.
        if (this.config.get<string>('WHATSAPP_PRUEBA_SIN_9') === 'true')
        {
            numero = '54' + numero.slice(3);
        }

        return numero;
    }
}
