import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInstitutionsTypeService } from './clarisa-institutions-type.service';

describe('ClarisaInstitutionsTypeService', () => {
  let service: ClarisaInstitutionsTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaInstitutionsTypeService],
    }).compile();

    service = module.get<ClarisaInstitutionsTypeService>(ClarisaInstitutionsTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
