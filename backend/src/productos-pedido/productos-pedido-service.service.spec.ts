import { Test, TestingModule } from '@nestjs/testing';
import { ProductosPedidoService } from './productos-pedido-service.service';

describe('ProductosPedidoServiceService', () => {
  let service: ProductosPedidoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductosPedidoService],
    }).compile();

    service = module.get<ProductosPedidoService>(ProductosPedidoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
