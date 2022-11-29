import { Test, TestingModule } from '@nestjs/testing';
import { NonPooledProjectsService } from './non-pooled-projects.service';

describe('NonPooledProjectsService', () => {
  let service: NonPooledProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NonPooledProjectsService],
    }).compile();

    service = module.get<NonPooledProjectsService>(NonPooledProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
