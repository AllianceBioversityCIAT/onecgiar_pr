import { Test, TestingModule } from '@nestjs/testing';
import { NonPooledPackageProjectsService } from './non-pooled-package-projects.service';

describe('NonPooledPackageProjectsService', () => {
  let service: NonPooledPackageProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NonPooledPackageProjectsService],
    }).compile();

    service = module.get<NonPooledPackageProjectsService>(NonPooledPackageProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
