import { Test, TestingModule } from '@nestjs/testing';
import { GestionEnviosPedidosController } from './gestion-envios-pedidos.controller';
import { GestionEnviosPedidosService } from './gestion-envios-pedidos.service';

describe('GestionEnviosPedidosController', () => {
  let controller: GestionEnviosPedidosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GestionEnviosPedidosController],
      providers: [GestionEnviosPedidosService],
    }).compile();

    controller = module.get<GestionEnviosPedidosController>(GestionEnviosPedidosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
