import { Test, TestingModule } from '@nestjs/testing';
import { BeneficiosService } from './beneficios.service';

describe('BeneficiosService', () => {
  let service: BeneficiosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BeneficiosService],
    }).compile();

    service = module.get<BeneficiosService>(BeneficiosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
