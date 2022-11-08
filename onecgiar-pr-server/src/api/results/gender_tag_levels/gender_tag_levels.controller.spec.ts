import { Test, TestingModule } from '@nestjs/testing';
import { GenderTagLevelsController } from './gender_tag_levels.controller';
import { GenderTagLevelsService } from './gender_tag_levels.service';

describe('GenderTagLevelsController', () => {
  let controller: GenderTagLevelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenderTagLevelsController],
      providers: [GenderTagLevelsService],
    }).compile();

    controller = module.get<GenderTagLevelsController>(
      GenderTagLevelsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
