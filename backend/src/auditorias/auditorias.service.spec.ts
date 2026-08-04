import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriasService } from './auditorias.service';

describe('AuditoriasService', () => {
  let service: AuditoriasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditoriasService],
    }).compile();

    service = module.get<AuditoriasService>(AuditoriasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
