import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInnovationTypeService } from './clarisa-innovation-type.service';

describe('ClarisaInnovationTypeService', () => {
  let service: ClarisaInnovationTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaInnovationTypeService],
    }).compile();

    service = module.get<ClarisaInnovationTypeService>(ClarisaInnovationTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
