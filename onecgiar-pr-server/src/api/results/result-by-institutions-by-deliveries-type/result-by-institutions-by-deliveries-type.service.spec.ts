import { Test, TestingModule } from '@nestjs/testing';
import { ResultByInstitutionsByDeliveriesTypeService } from './result-by-institutions-by-deliveries-type.service';

describe('ResultByInstitutionsByDeliveriesTypeService', () => {
  let service: ResultByInstitutionsByDeliveriesTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultByInstitutionsByDeliveriesTypeService],
    }).compile();

    service = module.get<ResultByInstitutionsByDeliveriesTypeService>(ResultByInstitutionsByDeliveriesTypeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
