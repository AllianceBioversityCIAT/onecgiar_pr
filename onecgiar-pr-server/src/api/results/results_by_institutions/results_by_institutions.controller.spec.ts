import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByInstitutionsController } from './results_by_institutions.controller';
import { ResultsByInstitutionsService } from './results_by_institutions.service';

describe('ResultsByInstitutionsController', () => {
  let controller: ResultsByInstitutionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsByInstitutionsController],
      providers: [ResultsByInstitutionsService],
    }).compile();

    controller = module.get<ResultsByInstitutionsController>(
      ResultsByInstitutionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
