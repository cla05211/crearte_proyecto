import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { PermisosGuard } from 'src/permisos/guards/permisos.guard';
import { RequierePermiso } from 'src/permisos/requiere_permismos.decorator';
import { CuotasService } from './cuotas.service';

@Controller('cuotas')
export class CuotasController 
{
    constructor(private cuotasService: CuotasService){}
}
