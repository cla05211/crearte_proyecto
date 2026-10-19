import { Controller, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { AlumnoResponsableService } from './alumno-responsable.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { alumnoResponsableResponseDTO } from './dto/alumnoResponsableResponse.dto';

@Controller('alumno-responsable')
export class AlumnoResponsableController 
{
    constructor(private alumnoResponsableService: AlumnoResponsableService){}

    @Get(':id')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_datos')
    traerAlumnosResponsables(@Param("id", ParseIntPipe) idGrupo: number):Promise<alumnoResponsableResponseDTO[]>
    {
        return this.alumnoResponsableService.traerAlumnosResponsables(idGrupo);
    }    

    @Patch(':id/:idNuevoAlumnoPrincipal')
    @UseGuards(AuthGuard,PermisosGuard)
    @RequierePermiso('ver_clientes_datos')
    modificarAlumnoPrincipal(@Param("id", ParseIntPipe) idGrupo: number, @Param('idNuevoAlumnoPrincipal', ParseIntPipe) idNuevoAlumnoPrincipal:number):Promise<alumnoResponsableResponseDTO>
    {
        return this.alumnoResponsableService.modificarAlumnoPrincipal(idNuevoAlumnoPrincipal,idGrupo);
    }    

}
