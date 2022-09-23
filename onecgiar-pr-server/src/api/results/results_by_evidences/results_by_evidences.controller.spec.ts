import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByEvidencesController } from './results_by_evidences.controller';
import { ResultsByEvidencesService } from './results_by_evidences.service';

describe('ResultsByEvidencesController', () => {
  let controller: ResultsByEvidencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsByEvidencesController],
      providers: [ResultsByEvidencesService],
    }).compile();

    controller = module.get<ResultsByEvidencesController>(ResultsByEvidencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
