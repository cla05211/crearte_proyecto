import { Test, TestingModule } from '@nestjs/testing';
import { ProductosPedidoController } from './productos-pedido.controller';

describe('ProductosPedidoController', () => {
  let controller: ProductosPedidoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductosPedidoController],
    }).compile();

    controller = module.get<ProductosPedidoController>(ProductosPedidoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
