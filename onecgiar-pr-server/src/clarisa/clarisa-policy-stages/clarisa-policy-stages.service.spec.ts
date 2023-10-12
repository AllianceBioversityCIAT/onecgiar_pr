import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaPolicyStagesService } from './clarisa-policy-stages.service';

describe('ClarisaPolicyStagesService', () => {
  let service: ClarisaPolicyStagesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaPolicyStagesService],
    }).compile();

    service = module.get<ClarisaPolicyStagesService>(
      ClarisaPolicyStagesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
