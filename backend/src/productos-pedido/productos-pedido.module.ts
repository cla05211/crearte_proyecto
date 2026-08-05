import { Module } from '@nestjs/common';
import { ProductosPedidoController } from './productos-pedido.controller';
import { PermisosService } from 'src/permisos/permisos.service';
import { ProductosPedidoService } from './productos-pedido-service.service';

@Module({
  controllers: [ProductosPedidoController],
  providers: [PermisosService, ProductosPedidoService]
})
export class ProductosPedidoModule {}
