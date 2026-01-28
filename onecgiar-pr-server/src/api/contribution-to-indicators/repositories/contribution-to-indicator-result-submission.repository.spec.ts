import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ContributionToIndicatorSubmissionRepository } from './contribution-to-indicator-result-submission.repository';

describe('ContributionToIndicatorSubmissionRepository', () => {
  let repo: ContributionToIndicatorSubmissionRepository;
  const mockDataSource = {
    createEntityManager: jest.fn(() => ({}) as any),
  } as unknown as DataSource;
  const mockHandlersError = {
    returnErrorRepository: jest.fn((e: any) => e),
  } as unknown as HandlersError;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ContributionToIndicatorSubmissionRepository(
      mockDataSource,
      mockHandlersError,
    );
  });

  it('should be defined and construct with DataSource and HandlersError', () => {
    expect(repo).toBeDefined();
    expect(repo).toBeInstanceOf(ContributionToIndicatorSubmissionRepository);
    expect(mockDataSource.createEntityManager).toHaveBeenCalled();
  });

  it('should extend Repository and expose Repository APIs', () => {
    expect(typeof repo.save).toBe('function');
    expect(typeof repo.find).toBe('function');
    expect(typeof repo.findOne).toBe('function');
  });
});
