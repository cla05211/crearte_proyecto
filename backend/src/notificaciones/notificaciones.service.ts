import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { inicializarNotificacionesDTO } from './dto/notificacionesAdminInicializar.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { NotificacionesDTO } from './dto/notificaciones.dto copy';
import { WatsappService } from 'src/watsapp/watsapp.service';
import { mensajeDTO } from '../watsapp/plantillasMensajes/mensajeDto';
import { mensajeInicialAdminDTO } from 'src/watsapp/plantillasMensajes/mensajeInicialAdminDto';
import { ClientesAuthService } from 'src/clientes-auth/clientes-auth-service.service';

@Injectable()
export class NotificacionesService 
{
    constructor(private sb: SupabaseService, private whatsapp: WatsappService, private clientesAuth: ClientesAuthService){}

    //Llamados watsapp
    async enviarMensajesVenta(idPedido: number, idGrupo:number, number,telefono:string, mensajeInicialAdmin: mensajeInicialAdminDTO)
    {
        const enviados: string[]= [];
        const fallidos:string[] = [];

        const envios: { plantilla: string; enviar: () => Promise<string> }[] = [
        { plantilla: 'mensaje_inicial_cuotas',          enviar: () => this.enviarMensajeInicialAdmin(telefono, mensajeInicialAdmin) },
        { plantilla: 'mensaje_inicial_datos_bancarios', enviar: () => this.enviarMensajeInicialBancoAdmin(telefono, mensajeInicialAdmin) },
        { plantilla: 'disenio_contacto_inicial',        enviar: () => this.enviarMensajesInicialesDisenio(telefono) },
        { plantilla: 'talles_inicial_plataforma',       enviar: () => this.enviarMensajesInicialesTalles(telefono,idGrupo) },];
        
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
        this.actualizarEstadoMensajes(idPedido, enviados, fallidos);
    }

    async enviarMensajeInicialAdmin(telefono:string, dto: mensajeInicialAdminDTO):Promise<string>
    {
        const variables = [`${dto.fechaPagoSenia}`]

        const cuotasMenosUltima = dto.cuotas.slice(0, -1);
        const textoCuotas = dto.cuotas.slice(0, -1)
            .map(c => `${c.nro}: ${this.formatearDiaMes(c.fechaPago)}`)
            .join(' / ');        
        variables.push(textoCuotas, ((dto.cuotas).length).toString());

        return this.whatsapp.enviarPlantilla(telefono,"mensaje_inicial_cuotas",variables);
    }

    async enviarMensajeInicialBancoAdmin(telefono:string, dto: mensajeInicialAdminDTO):Promise<string>
    {
        return await this.whatsapp.enviarPlantilla(telefono,"mensaje_inicial_datos_bancarios",this.traerDatosBanco(dto.banco));
    }

    async enviarMensajesInicialesDisenio(telefono:string):Promise<string>
    {
        return await this.whatsapp.enviarPlantilla(telefono,"disenio_contacto_inicial");
    }

    async enviarMensajesInicialesTalles(telefono:string, idGrupo:number):Promise<string>
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

    async inicializarNotificaciones(dto: inicializarNotificacionesDTO)
    {
        const notificaciones: NotificacionesDTO[] = [];
        const notificacionesAdmin = this.prepararNotificacionesAdmin(dto);
        const notificacionesTalles = this.prepararNotificacionesTalles(dto);
        const notificacionesDisenio = this.prepararNotificacionesDisenio(dto);
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

    prepararNotificacionesAdmin(dto: inicializarNotificacionesDTO): NotificacionesDTO[]
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

    prepararNotificacionesTalles(dto: inicializarNotificacionesDTO)
    {
        let notificaciones: NotificacionesDTO[] = [];
        notificaciones.push({id_pedido: dto.id_pedido, plantilla: "talles_inicial_plataforma", estado: "pendiente", sector:"Talles"})
    
        return notificaciones;
    }

    prepararNotificacionesDisenio(dto: inicializarNotificacionesDTO)
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
}
