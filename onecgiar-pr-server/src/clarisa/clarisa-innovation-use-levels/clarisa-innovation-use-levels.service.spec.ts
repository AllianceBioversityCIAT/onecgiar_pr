import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';

describe('ClarisaInnovationUseLevelsService', () => {
  let service: ClarisaInnovationUseLevelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaInnovationUseLevelsService],
    }).compile();

    service = module.get<ClarisaInnovationUseLevelsService>(
      ClarisaInnovationUseLevelsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
