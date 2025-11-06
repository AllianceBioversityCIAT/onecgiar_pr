import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProjectsRepository } from './clarisa-projects.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

describe('ClarisaProjectsService', () => {
  let service: ClarisaProjectsService;
  let repository: ClarisaProjectsRepository;

  const mockRepository = {
    find: jest.fn(),
  };

  const mockHandlersError = {
    returnErrorRepository: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaProjectsService,
        {
          provide: ClarisaProjectsRepository,
          useValue: mockRepository,
        },
        {
          provide: HandlersError,
          useValue: mockHandlersError,
        },
      ],
    }).compile();

    service = module.get<ClarisaProjectsService>(ClarisaProjectsService);
    repository = module.get<ClarisaProjectsRepository>(
      ClarisaProjectsRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all projects successfully', async () => {
      const mockProjects = [{ id: 1, name: 'Test Project' }];
      mockRepository.find.mockResolvedValue(mockProjects);

      const result = await service.findAll();

      expect(result.response).toBe(mockProjects);
      expect(result.status).toBe(200);
      expect(repository.find).toHaveBeenCalled();
    });
  });
});
