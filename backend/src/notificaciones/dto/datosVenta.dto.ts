import { EstadoSenia } from "src/pagos/estadoSeña.util";
import { inicializarNotificacionesDTO } from "./notificacionesAdminInicializar.dto";

export class DatosVentaNotisDto
{
    datosNotis!: inicializarNotificacionesDTO;
    idGrupo!: number;
    telefono! :string; 
    // Secundaria: alumno responsable principal. Resto de niveles: mismo que telefono (padre principal)
    telefonoDisenio!: string;
    estadoSenia!: EstadoSenia;
    nroUltimaCuota!: number;
}
