import { Test, TestingModule } from '@nestjs/testing';
import { MovimientosCajaController } from './movimientos-caja.controller';

describe('MovimientosCajaController', () => {
  let controller: MovimientosCajaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MovimientosCajaController],
    }).compile();

    controller = module.get<MovimientosCajaController>(MovimientosCajaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
