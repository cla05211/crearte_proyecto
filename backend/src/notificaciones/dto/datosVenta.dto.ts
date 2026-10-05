import { EstadoSenia } from "src/pagos/estadoSeña.util";
import { inicializarNotificacionesDTO } from "./notificacionesAdminInicializar.dto";

export class DatosVentaNotisDto
{
    datosNotis!: inicializarNotificacionesDTO;
    idGrupo!: number;
    telefono! :string; 
    estadoSenia!: EstadoSenia;
    nroUltimaCuota!: number;
}
