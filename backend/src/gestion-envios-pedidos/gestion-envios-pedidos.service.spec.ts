import { Test, TestingModule } from '@nestjs/testing';
import { GestionEnviosPedidosService } from './gestion-envios-pedidos.service';

describe('GestionEnviosPedidosService', () => {
  let service: GestionEnviosPedidosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GestionEnviosPedidosService],
    }).compile();

    service = module.get<GestionEnviosPedidosService>(GestionEnviosPedidosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
