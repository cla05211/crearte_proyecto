import { Module } from '@nestjs/common';
import { PedidosService } from './pedidos.service';

@Module({
    imports: [PedidosModule],
    providers: [PedidosService],
    exports: [PedidosService],
})
export class PedidosModule {}
