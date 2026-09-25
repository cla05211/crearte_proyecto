import { Test, TestingModule } from '@nestjs/testing';
import { BeneficiosPedidoController } from './beneficios-pedido.controller';

describe('BeneficiosPedidoController', () => {
  let controller: BeneficiosPedidoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BeneficiosPedidoController],
    }).compile();

    controller = module.get<BeneficiosPedidoController>(BeneficiosPedidoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
