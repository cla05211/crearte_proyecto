import { Test, TestingModule } from '@nestjs/testing';
import { GestionPedidosService } from './gestion-pedidos.service';

describe('GestionPedidosService', () => {
  let service: GestionPedidosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GestionPedidosService],
    }).compile();

    service = module.get<GestionPedidosService>(GestionPedidosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
