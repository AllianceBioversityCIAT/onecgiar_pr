import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaProjectsRepository } from './clarisa-projects.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

describe('ClarisaProjectsRepository', () => {
  let repository: ClarisaProjectsRepository;

  const mockDataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  };

  const mockHandlersError = {
    returnErrorRepository: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaProjectsRepository,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: HandlersError,
          useValue: mockHandlersError,
        },
      ],
    }).compile();

    repository = module.get<ClarisaProjectsRepository>(
      ClarisaProjectsRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });
});
