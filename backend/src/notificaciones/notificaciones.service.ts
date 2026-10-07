import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { inicializarNotificacionesDTO } from './dto/notificacionesAdminInicializar.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { NotificacionesDTO } from './dto/notificaciones.dto copy';
import { WatsappService } from 'src/watsapp/watsapp.service';
import { ClientesAuthService } from 'src/clientes-auth/clientes-auth-service.service';
import { DatosVentaNotisDto } from './dto/datosVenta.dto';
import { calcularEstadoSenia } from 'src/pagos/estadoSeña.util';

@Injectable()
export class NotificacionesService 
{
    constructor(private sb: SupabaseService, private whatsapp: WatsappService, private clientesAuth: ClientesAuthService){}

    //general
    async procesarNuevaVenta(idPedido:number)
    {
        const venta = await this.obtenerDatosVenta(idPedido);
        await this.inicializarNotificaciones(venta);
        await this.enviarMensajesVenta(venta);
    }

    //Llamados watsapp
    async enviarMensajesVenta(ventaDatos: DatosVentaNotisDto)
    {
        const enviados: string[]= [];
        const fallidos:string[] = [];

        const envios: { plantilla: string; enviar: () => Promise<string> }[] = [
        { plantilla: 'mensaje_inicial_cuotas',          enviar: () => this.enviarMensajeInicialAdmin(ventaDatos) },
        { plantilla: 'mensaje_inicial_datos_bancarios', enviar: () => this.enviarMensajeInicialBancoAdmin(ventaDatos) },
        { plantilla: 'disenio_contacto_inicial',        enviar: () => this.enviarMensajesInicialesDisenio(ventaDatos.telefono) },
        { plantilla: 'talles_inicial_plataforma',       enviar: () => this.enviarMensajesInicialesTalles(ventaDatos.telefono, ventaDatos.idGrupo) },];
        
        for (const envio of envios)
        {
            try
            {
                await envio.enviar();
                enviados.push(envio.plantilla);
            }
            catch (error)
            {
                fallidos.push(envio.plantilla);
            }
        }

        //Tabla notis (junto todo y le mando todo junto, el id del pedido ylas plantillas para eq)
        this.actualizarEstadoMensajes(ventaDatos.datosNotis.id_pedido, enviados, fallidos);
    }

    private async enviarMensajeInicialAdmin(datos: DatosVentaNotisDto):Promise<string>
    {   
        let variableSenia = '';

        if(datos.estadoSenia.completa)
        {
            variableSenia = `Ya abonada el ${datos.estadoSenia.fechaUltimoPago}`;
        }
        else
        {
            variableSenia = `Restan ${datos.estadoSenia.restante}`;
        }

        const variables = [variableSenia]

        const textoCuotas = datos.datosNotis.cuotas.slice(0, -1)
            .map(c => `${c.nro}: ${this.formatearDiaMes(c.fechaVencimiento)}`)
            .join(' / ');        
        variables.push(textoCuotas, ((datos.datosNotis.cuotas).length).toString());

        return this.whatsapp.enviarPlantilla(datos.telefono,"mensaje_inicial_cuotas",variables);
    }

    private async enviarMensajeInicialBancoAdmin(datos: DatosVentaNotisDto):Promise<string>
    {
        return await this.whatsapp.enviarPlantilla(datos.telefono,"mensaje_inicial_datos_bancarios",this.traerDatosBanco(datos.datosNotis.banco));
    }

    private async enviarMensajesInicialesDisenio(telefono:string):Promise<string>
    {
        return await this.whatsapp.enviarPlantilla(telefono,"disenio_contacto_inicial");
    }

    private async enviarMensajesInicialesTalles(telefono:string, idGrupo:number):Promise<string>
    {
        const { token } = await this.clientesAuth.generarLinkActivacion(idGrupo);
        //boton
        return this.whatsapp.enviarPlantilla(telefono, 'talles_inicial_plataforma', ["https://drive.google.com/file/d/1zFZpWPpuVNV7uWi8Q-aafA_oQkeFARlx/view?usp=sharing "], token);
    }

    //para las fechas 9/8
    private formatearDiaMes(fecha: string): string
    {
        const [, mes, dia] = fecha.split('-');      // "2026-10-05" -> ["2026","10","05"]
        return `${Number(dia)}/${Number(mes)}`;     // "5/10"
    }

    //bancos
    private traerDatosBanco(banco:"Comafi"|"Santander"):string[]
    {
        let datos: string[] = []

        if (banco == "Comafi")
        {
            datos.push("COMAFI","Cuenta Corriente en pesos","1600-03479/4","2990160716000347940008","FRESA.ANGULO.INCA","Centro Logístico Sur SRL.");
        }
        else if (banco == "Santander")
        {
            datos.push("Santander","Cuenta Corriente en pesos","041-367767/0","0720041088000036776704","NUCLEO.FRASCO.RADIO","Adrian Alejandro Coassini");
        }

        return datos;
    }

    //Notificaciones

    async inicializarNotificaciones(ventaDatos: DatosVentaNotisDto)
    {
        const notificaciones: NotificacionesDTO[] = [];
        const notificacionesAdmin = this.prepararNotificacionesAdmin(ventaDatos.datosNotis);
        const notificacionesTalles = this.prepararNotificacionesTalles(ventaDatos.datosNotis);
        const notificacionesDisenio = this.prepararNotificacionesDisenio(ventaDatos.datosNotis);
        notificaciones.push(...notificacionesAdmin);
        notificaciones.push(...notificacionesTalles);
        notificaciones.push(...notificacionesDisenio);

        const {data,error} = await this.sb.supabase
            .from('notificaciones_whatsapp')
            .insert(notificaciones)

        if (error) 
        {
            throw new InternalServerErrorException(error.message);
        }         
    }

    private prepararNotificacionesAdmin(dto: inicializarNotificacionesDTO): NotificacionesDTO[]
    {
        let notificaciones: NotificacionesDTO[] = [];

        notificaciones.push({id_pedido: dto.id_pedido, plantilla: "mensaje_inicial_cuotas", estado: "pendiente", sector:"Administración"})
        notificaciones.push({id_pedido: dto.id_pedido, plantilla: "mensaje_inicial_datos_bancarios", estado: "pendiente", sector:"Administración"})
        notificaciones.push({id_pedido: dto.id_pedido, plantilla: "contrato", estado: "pendiente", sector:"Administración"})
        notificaciones.push({id_pedido: dto.id_pedido, plantilla: "recordatorio_contrato", estado: "pendiente", sector:"Administración"})

        if(dto.zonaSur)
        {
            notificaciones.push({id_pedido: dto.id_pedido, plantilla: "pedido_listo_zona_sur", estado: "pendiente", sector:"Administración"});
        }
        else
        {
            notificaciones.push({id_pedido: dto.id_pedido, plantilla: "pedido_listo_interior", estado: "pendiente", sector:"Administración"})
            if(dto.envioGratis)
            {
                notificaciones.push({id_pedido: dto.id_pedido, plantilla: "pedido_listo_interior_con_envio_gratis_2", estado: "pendiente", sector:"Administración"})
            }
            else
            {
                notificaciones.push({id_pedido: dto.id_pedido, plantilla: "pedido_listo_interior_sin_envio_gratis_2", estado: "pendiente", sector:"Administración"})
            }
        }

        const cuotasConAviso = dto.cuotas.slice(0, -1);

        for (const cuota of cuotasConAviso)
        {
            const vencimiento = cuota.fechaVencimiento;

            const fechaAviso = new Date(vencimiento);
            fechaAviso.setDate(fechaAviso.getDate() - 7);

            notificaciones.push({id_pedido: dto.id_pedido, plantilla: "recordatorio_pago", estado: "pendiente", sector:"Administración", id_cuota:cuota.id, fecha_programada: fechaAviso.toISOString()})
        }

        return notificaciones;
    }

    private prepararNotificacionesTalles(dto: inicializarNotificacionesDTO)
    {
        let notificaciones: NotificacionesDTO[] = [];
        notificaciones.push({id_pedido: dto.id_pedido, plantilla: "talles_inicial_plataforma", estado: "pendiente", sector:"Talles"})
    
        return notificaciones;
    }

    private prepararNotificacionesDisenio(dto: inicializarNotificacionesDTO)
    {
        let notificaciones: NotificacionesDTO[] = [];
        notificaciones.push({id_pedido: dto.id_pedido, plantilla: "disenio_contacto_inicial", estado: "pendiente", sector:"Disenio"})
        
        if(dto.beneficioBandera)
        {
            notificaciones.push({id_pedido: dto.id_pedido, plantilla: "disenio_bandera", estado: "pendiente", sector:"Disenio"})
        }

        return notificaciones;
    }

    async actualizarEstadoMensajes(idPedido, enviadas: string[], fallidas: string[])
    {
        if (enviadas.length)
        {
            await this.sb.supabase.from('notificaciones_whatsapp')
                .update({ estado: 'enviado' })
                .eq('id_pedido', idPedido)
                .in('plantilla', enviadas);
        }
        if (fallidas.length)
        {
            await this.sb.supabase.from('notificaciones_whatsapp')
                .update({ estado: 'error' })
                .eq('id_pedido', idPedido)
                .in('plantilla', fallidas);
        }
    }

    //Recordatorios programados (los dispara pg_cron)
    async procesarRecordatoriosPendientes()
    {
        const hoy = this.fechaHoyArgentina();

        const { data, error } = await this.sb.supabase
            .from('notificaciones_whatsapp')
            .select(`
                id, plantilla,
                cuotas ( numero, fecha_vencimiento, importe, monto_cubierto, estado ),
                pedidos ( grupos ( padres_responsables ( telefono, mail ) ) )
            `)
            .eq('estado', 'pendiente')
            .eq('plantilla', 'recordatorio_pago')
            .lte('fecha_programada', hoy);

        if (error) throw new InternalServerErrorException(error.message);

        const resultado = { enviados: 0, cancelados: 0, fallidos: 0 };

        for (const noti of data)
        {
            const cuota = noti.cuotas;

            // Si la cuota ya está pagada
            if (!cuota || cuota.estado === 'Pagado')
            {
                await this.actualizarEstadoNotificacion(noti.id, 'cancelado');
                resultado.cancelados++;
                continue;
            }

            try
            {
                const telefono = noti.pedidos.grupos.padres_responsables.find(padre => padre.mail)?.telefono;
                if (!telefono) throw new Error(`Pedido sin teléfono de responsable (notificación ${noti.id})`);

                await this.whatsapp.enviarPlantilla(telefono, noti.plantilla);
                await this.actualizarEstadoNotificacion(noti.id, 'enviado');
                resultado.enviados++;
            }
            catch (error)
            {
                await this.actualizarEstadoNotificacion(noti.id, 'error');
                resultado.fallidos++;
            }
        }

        return resultado;
    }

    private async actualizarEstadoNotificacion(id: number, estado: 'enviado' | 'error' | 'cancelado')
    {
        await this.sb.supabase.from('notificaciones_whatsapp')
            .update({ estado })
            .eq('id', id);
    }

    private fechaHoyArgentina(): string
    {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    }

    //datos
    private async obtenerDatosVenta(idPedido:number): Promise<DatosVentaNotisDto>
    {
        //Por ahora hardcodeo banco
        const banco = "Santander";

        const { data, error } = await this.sb.supabase
            .from('pedidos')
            .select(`
                id, id_grupo, envio_gratis,
                grupos (id, promo, colegios ( nombre, localidad, provincia, zona_sur ),
                        padres_responsables (telefono, mail )),
                cuotas ( id, numero, fecha_vencimiento, importe),
                pagos ( monto, motivo, fecha ),
                beneficios_pedido(id_beneficio),
                productos_pedidos(valor_senia, cantidad)
            `)
            .eq('id', idPedido)
            .single();

        if (error) throw new Error(error.message);

        const estadoSenia = calcularEstadoSenia(data.productos_pedidos, data.pagos);

        const venta: DatosVentaNotisDto = {datosNotis:{id_pedido: idPedido, 
            cuotas: data.cuotas.map(c => ({id:c.id,nro: c.numero! ,fechaVencimiento:c.fecha_vencimiento!.toString()})), 
            banco:banco, localidad:data.grupos.colegios.localidad, provincia:data.grupos.colegios.provincia, envioGratis:data.envio_gratis!, 
            zonaSur: data.grupos.colegios.zona_sur, beneficioBandera: data.beneficios_pedido.find(b => b.id_beneficio == 1) ? true: false },
            idGrupo: data.grupos.id, telefono: data.grupos.padres_responsables.find(padre => padre.mail)!.telefono!, estadoSenia:estadoSenia,
            nroUltimaCuota: (estadoSenia.total == data.cuotas[0].importe)? data.cuotas.length + 1 : data.cuotas.length};
        
            return venta;
    }
}
