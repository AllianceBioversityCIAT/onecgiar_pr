import { Test, TestingModule } from '@nestjs/testing';
import { ResultsByProjectsService } from './results_by_projects.service';

describe('ResultsByProjectsService', () => {
  let service: ResultsByProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsByProjectsService],
    }).compile();

    service = module.get<ResultsByProjectsService>(ResultsByProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
