import { Test, TestingModule } from '@nestjs/testing';
import { PadreResponsableController } from './padre-responsable.controller';

describe('PadreResponsableController', () => {
  let controller: PadreResponsableController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PadreResponsableController],
    }).compile();

    controller = module.get<PadreResponsableController>(PadreResponsableController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
