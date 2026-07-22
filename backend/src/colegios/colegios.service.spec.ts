import { Test, TestingModule } from '@nestjs/testing';
import { ColegiosService } from './colegios.service';

describe('ColegiosServiceService', () => {
  let service: ColegiosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ColegiosService],
    }).compile();

    service = module.get<ColegiosService>(ColegiosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
