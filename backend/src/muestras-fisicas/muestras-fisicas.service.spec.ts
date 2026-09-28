import { Test, TestingModule } from '@nestjs/testing';
import { MuestrasFisicasService } from './muestras-fisicas.service';

describe('MuestrasFisicasService', () => {
  let service: MuestrasFisicasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MuestrasFisicasService],
    }).compile();

    service = module.get<MuestrasFisicasService>(MuestrasFisicasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
