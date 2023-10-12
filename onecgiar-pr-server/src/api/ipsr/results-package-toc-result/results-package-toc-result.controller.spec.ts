import { Test, TestingModule } from '@nestjs/testing';
import { ResultsPackageTocResultController } from './results-package-toc-result.controller';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';

describe('ResultsPackageTocResultController', () => {
  let controller: ResultsPackageTocResultController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsPackageTocResultController],
      providers: [ResultsPackageTocResultService],
    }).compile();

    controller = module.get<ResultsPackageTocResultController>(
      ResultsPackageTocResultController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
