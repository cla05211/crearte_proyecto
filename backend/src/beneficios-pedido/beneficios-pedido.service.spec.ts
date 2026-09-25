import { Test, TestingModule } from '@nestjs/testing';
import { BeneficiosPedidoService } from './beneficios-pedido.service';

describe('BeneficiosPedidoService', () => {
  let service: BeneficiosPedidoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BeneficiosPedidoService],
    }).compile();

    service = module.get<BeneficiosPedidoService>(BeneficiosPedidoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
