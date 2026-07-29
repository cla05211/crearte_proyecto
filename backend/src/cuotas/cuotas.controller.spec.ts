import { Test, TestingModule } from '@nestjs/testing';
import { CuotasController } from './cuotas.controller';

describe('CuotasController', () => {
  let controller: CuotasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CuotasController],
    }).compile();

    controller = module.get<CuotasController>(CuotasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
