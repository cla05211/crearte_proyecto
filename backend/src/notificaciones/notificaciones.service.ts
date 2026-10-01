import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { inicializarNotificacionesDTO } from './dto/notificacionesAdminInicializar.dto';
import { SupabaseService } from 'src/supabase/supabase.service';
import { NotificacionesDTO } from './dto/notificaciones.dto copy';

@Injectable()
export class NotificacionesService 
{
    constructor(private sb: SupabaseService){}

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



}
