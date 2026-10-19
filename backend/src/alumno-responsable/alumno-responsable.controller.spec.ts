import { Test, TestingModule } from '@nestjs/testing';
import { AlumnoResponsableController } from './alumno-responsable.controller';

describe('AlumnoResponsableController', () => {
  let controller: AlumnoResponsableController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlumnoResponsableController],
    }).compile();

    controller = module.get<AlumnoResponsableController>(AlumnoResponsableController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
