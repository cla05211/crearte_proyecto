import { Test, TestingModule } from '@nestjs/testing';
import { ClientesAuthController } from './clientes-auth.controller';

describe('ClientesAuthController', () => {
  let controller: ClientesAuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientesAuthController],
    }).compile();

    controller = module.get<ClientesAuthController>(ClientesAuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
