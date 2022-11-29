import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';

describe('ClarisaInitiativesService', () => {
  let service: ClarisaInitiativesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaInitiativesService],
    }).compile();

    service = module.get<ClarisaInitiativesService>(ClarisaInitiativesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
