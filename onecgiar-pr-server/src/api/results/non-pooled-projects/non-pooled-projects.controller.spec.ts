import { Test, TestingModule } from '@nestjs/testing';
import { NonPooledProjectsController } from './non-pooled-projects.controller';
import { NonPooledProjectsService } from './non-pooled-projects.service';

describe('NonPooledProjectsController', () => {
  let controller: NonPooledProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NonPooledProjectsController],
      providers: [NonPooledProjectsService],
    }).compile();

    controller = module.get<NonPooledProjectsController>(NonPooledProjectsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
