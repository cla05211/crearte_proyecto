import { Test, TestingModule } from '@nestjs/testing';
import { ClientesAuthServiceService } from './clientes-auth-service.service';

describe('ClientesAuthServiceService', () => {
  let service: ClientesAuthServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientesAuthServiceService],
    }).compile();

    service = module.get<ClientesAuthServiceService>(ClientesAuthServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
