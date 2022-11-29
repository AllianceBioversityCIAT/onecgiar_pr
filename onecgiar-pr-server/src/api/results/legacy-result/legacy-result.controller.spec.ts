import { Test, TestingModule } from '@nestjs/testing';
import { LegacyResultController } from './legacy-result.controller';
import { LegacyResultService } from './legacy-result.service';

describe('LegacyResultController', () => {
  let controller: LegacyResultController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegacyResultController],
      providers: [LegacyResultService],
    }).compile();

    controller = module.get<LegacyResultController>(LegacyResultController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
