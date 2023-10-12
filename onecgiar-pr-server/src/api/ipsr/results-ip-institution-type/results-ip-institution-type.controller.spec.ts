import { Test, TestingModule } from '@nestjs/testing';
import { ResultsIpInstitutionTypeController } from './results-ip-institution-type.controller';
import { ResultsIpInstitutionTypeService } from './results-ip-institution-type.service';

describe('ResultsIpInstitutionTypeController', () => {
  let controller: ResultsIpInstitutionTypeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsIpInstitutionTypeController],
      providers: [ResultsIpInstitutionTypeService],
    }).compile();

    controller = module.get<ResultsIpInstitutionTypeController>(
      ResultsIpInstitutionTypeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
