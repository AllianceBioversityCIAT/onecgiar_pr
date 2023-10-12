import { Test, TestingModule } from '@nestjs/testing';
import { NonPooledPackageProjectsController } from './non-pooled-package-projects.controller';
import { NonPooledPackageProjectsService } from './non-pooled-package-projects.service';

describe('NonPooledPackageProjectsController', () => {
  let controller: NonPooledPackageProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NonPooledPackageProjectsController],
      providers: [NonPooledPackageProjectsService],
    }).compile();

    controller = module.get<NonPooledPackageProjectsController>(
      NonPooledPackageProjectsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
