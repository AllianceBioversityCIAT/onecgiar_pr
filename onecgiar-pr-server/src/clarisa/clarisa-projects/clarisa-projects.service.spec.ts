import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaProjectsService } from './clarisa-projects.service';

describe('ClarisaProjectsService', () => {
  let service: ClarisaProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaProjectsService],
    }).compile();

    service = module.get<ClarisaProjectsService>(ClarisaProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
