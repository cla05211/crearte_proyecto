import { Test, TestingModule } from '@nestjs/testing';
import { AgregadosController } from './agregados.controller';
import { AgregadosService } from './agregados.service';

describe('AgregadosController', () => {
  let controller: AgregadosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgregadosController],
      providers: [AgregadosService],
    }).compile();

    controller = module.get<AgregadosController>(AgregadosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
