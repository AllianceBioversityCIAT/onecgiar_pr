import { HttpStatus } from '@nestjs/common';
import { TocLevelService } from './toc-level.service';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TocLevelRepository } from './toc-level.repository';

describe('TocLevelService', () => {
  let service: TocLevelService;
  let handlersError: jest.Mocked<HandlersError>;
  let repository: jest.Mocked<TocLevelRepository>;

  beforeEach(() => {
    handlersError = {
      returnErrorRes: jest.fn(),
      returnData: jest.fn(),
      returnErrorRepository: jest.fn(),
    } as any;

    repository = {
      getAllTocLevel: jest.fn(),
    } as any;

    service = new TocLevelService(handlersError, repository);
  });

  it('returns successful response when repository returns data', async () => {
    const data = [{ id: 1 } as any];
    repository.getAllTocLevel.mockResolvedValue(data);

    const result = await service.findAll();

    expect(result).toEqual({
      response: data,
      message: 'Successful response',
      status: HttpStatus.OK,
    });
  });

  it('delegates to handlersError when repository returns empty list', async () => {
    const handled = { message: 'handled' } as any;
    repository.getAllTocLevel.mockResolvedValue([]);
    handlersError.returnErrorRes.mockReturnValue(handled);

    const result = await service.findAll();

    expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
      error: expect.any(Object),
    });
    expect(result).toBe(handled);
  });

  it('delegates to handlersError when repository throws', async () => {
    const error = new Error('fail');
    const handled = { message: 'handled' } as any;
    repository.getAllTocLevel.mockRejectedValue(error);
    handlersError.returnErrorRes.mockReturnValue(handled);

    const result = await service.findAll();

    expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
    expect(result).toBe(handled);
  });
});
