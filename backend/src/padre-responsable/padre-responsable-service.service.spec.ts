import { Test, TestingModule } from '@nestjs/testing';
import { PadreResponsableService } from './padre-responsable-service.service';

describe('PadreResponsableServiceService', () => {
  let service: PadreResponsableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PadreResponsableService],
    }).compile();

    service = module.get<PadreResponsableService>(PadreResponsableService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
