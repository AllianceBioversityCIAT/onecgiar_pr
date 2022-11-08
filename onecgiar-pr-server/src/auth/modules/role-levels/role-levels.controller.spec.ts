import { Test, TestingModule } from '@nestjs/testing';
import { RoleLevelsController } from './role-levels.controller';
import { RoleLevelsService } from './role-levels.service';

describe('RoleLevelsController', () => {
  let controller: RoleLevelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleLevelsController],
      providers: [RoleLevelsService],
    }).compile();

    controller = module.get<RoleLevelsController>(RoleLevelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
