import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByIpInnovationUseMeasuresController } from './results-by-ip-innovation-use-measures.controller';
import { ResultsByIpInnovationUseMeasuresService } from './results-by-ip-innovation-use-measures.service';

describe('ResultsByIpInnovationUseMeasuresController', () => {
  let controller: ResultsByIpInnovationUseMeasuresController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsByIpInnovationUseMeasuresController],
      providers: [ResultsByIpInnovationUseMeasuresService],
    }).compile();

    controller = module.get<ResultsByIpInnovationUseMeasuresController>(ResultsByIpInnovationUseMeasuresController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
