import { ResultsByProjectsRepository } from './results_by_projects.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

describe('ResultsByProjectsRepository', () => {
  const createEntityManager = jest.fn().mockReturnValue({});
  const dataSource: any = {
    createEntityManager,
  };

  const handlersError = new HandlersError();

  it('should instantiate with a TypeORM entity manager', () => {
    const repository = new ResultsByProjectsRepository(
      dataSource,
      handlersError,
    );

    expect(repository).toBeInstanceOf(ResultsByProjectsRepository);
    expect(createEntityManager).toHaveBeenCalled();
  });
});
