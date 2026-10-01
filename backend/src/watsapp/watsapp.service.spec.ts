import { Test, TestingModule } from '@nestjs/testing';
import { WatsappService } from './watsapp.service';

describe('WatsappService', () => {
  let service: WatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WatsappService],
    }).compile();

    service = module.get<WatsappService>(WatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
