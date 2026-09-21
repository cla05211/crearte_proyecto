import { Test, TestingModule } from '@nestjs/testing';
import { PrendasPedidoTallesService } from './prendas-pedido-talles.service';

describe('PrendasPedidoTallesService', () => {
  let service: PrendasPedidoTallesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrendasPedidoTallesService],
    }).compile();

    service = module.get<PrendasPedidoTallesService>(PrendasPedidoTallesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
