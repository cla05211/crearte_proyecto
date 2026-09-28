import { Test, TestingModule } from '@nestjs/testing';
import { MuestrasFisicasController } from './muestras-fisicas.controller';

describe('MuestrasFisicasController', () => {
  let controller: MuestrasFisicasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MuestrasFisicasController],
    }).compile();

    controller = module.get<MuestrasFisicasController>(MuestrasFisicasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
