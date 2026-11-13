import { Test, TestingModule } from '@nestjs/testing';
import { AgregadosService } from './agregados.service';

describe('AgregadosService', () => {
  let service: AgregadosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgregadosService],
    }).compile();

    service = module.get<AgregadosService>(AgregadosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
