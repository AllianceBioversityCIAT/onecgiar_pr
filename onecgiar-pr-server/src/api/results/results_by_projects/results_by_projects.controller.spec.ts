import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByProjectsController } from './results_by_projects.controller';
import { ResultsByProjectsService } from './results_by_projects.service';

describe('ResultsByProjectsController', () => {
  let controller: ResultsByProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsByProjectsController],
      providers: [ResultsByProjectsService],
    }).compile();

    controller = module.get<ResultsByProjectsController>(ResultsByProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
