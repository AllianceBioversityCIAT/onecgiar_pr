import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaPolicyTypesService } from './clarisa-policy-types.service';

describe('ClarisaPolicyTypesService', () => {
  let service: ClarisaPolicyTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaPolicyTypesService],
    }).compile();

    service = module.get<ClarisaPolicyTypesService>(ClarisaPolicyTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
