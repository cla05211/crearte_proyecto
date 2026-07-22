import { Test, TestingModule } from '@nestjs/testing';
import { AlumnoResponsableService } from './alumno-responsable.service';

describe('AlumnoResponsableServiceService', () => {
  let service: AlumnoResponsableService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlumnoResponsableService],
    }).compile();

    service = module.get<AlumnoResponsableService>(AlumnoResponsableService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
