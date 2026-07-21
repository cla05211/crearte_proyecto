import { Test, TestingModule } from '@nestjs/testing';
import { CuotasService } from './cuotas.service';

describe('CuotasService', () => {
  let service: CuotasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CuotasService],
    }).compile();

    service = module.get<CuotasService>(CuotasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
