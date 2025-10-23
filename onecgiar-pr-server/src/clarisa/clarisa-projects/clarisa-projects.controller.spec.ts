import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaProjectsController } from './clarisa-projects.controller';
import { ClarisaProjectsService } from './clarisa-projects.service';

describe('ClarisaProjectsController', () => {
  let controller: ClarisaProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaProjectsController],
      providers: [ClarisaProjectsService],
    }).compile();

    controller = module.get<ClarisaProjectsController>(
      ClarisaProjectsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
