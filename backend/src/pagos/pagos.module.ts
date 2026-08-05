import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PermisosService } from 'src/permisos/permisos.service';
import { PagosService } from './pagos.service';

@Module({
  controllers: [PagosController],
  providers:[PermisosService, PagosService]
})
export class PagosModule {}
