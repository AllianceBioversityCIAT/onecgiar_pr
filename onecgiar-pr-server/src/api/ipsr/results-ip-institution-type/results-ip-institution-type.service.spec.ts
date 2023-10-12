import { Test, TestingModule } from '@nestjs/testing';
import { ResultsIpInstitutionTypeService } from './results-ip-institution-type.service';

describe('ResultsIpInstitutionTypeService', () => {
  let service: ResultsIpInstitutionTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsIpInstitutionTypeService],
    }).compile();

    service = module.get<ResultsIpInstitutionTypeService>(
      ResultsIpInstitutionTypeService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
