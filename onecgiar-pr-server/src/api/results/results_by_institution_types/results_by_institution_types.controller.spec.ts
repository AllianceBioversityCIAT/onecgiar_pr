import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByInstitutionTypesController } from './results_by_institution_types.controller';
import { ResultsByInstitutionTypesService } from './results_by_institution_types.service';

describe('ResultsByInstitutionTypesController', () => {
  let controller: ResultsByInstitutionTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsByInstitutionTypesController],
      providers: [ResultsByInstitutionTypesService],
    }).compile();

    controller = module.get<ResultsByInstitutionTypesController>(
      ResultsByInstitutionTypesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
