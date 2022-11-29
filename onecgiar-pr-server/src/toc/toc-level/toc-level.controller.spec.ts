import { Test, TestingModule } from '@nestjs/testing';
import { TocLevelController } from './toc-level.controller';
import { TocLevelService } from './toc-level.service';

describe('TocLevelController', () => {
  let controller: TocLevelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TocLevelController],
      providers: [TocLevelService],
    }).compile();

    controller = module.get<TocLevelController>(TocLevelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
