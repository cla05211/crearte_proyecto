import { Test, TestingModule } from '@nestjs/testing';
import { MovimientosCajaService } from './movimientos-caja.service';

describe('MovimientosCajaService', () => {
  let service: MovimientosCajaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MovimientosCajaService],
    }).compile();

    service = module.get<MovimientosCajaService>(MovimientosCajaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
