import { Test, TestingModule } from '@nestjs/testing';
import { GestionPedidosController } from './gestion-pedidos.controller';

describe('GestionPedidosController', () => {
  let controller: GestionPedidosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GestionPedidosController],
    }).compile();

    controller = module.get<GestionPedidosController>(GestionPedidosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
