import { HttpStatus } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { TocResultsRepository } from './toc-results.repository';

describe('TocResultsService', () => {
  let service: TocResultsService;
  let handlersError: jest.Mocked<HandlersError>;
  let repository: jest.Mocked<TocResultsRepository>;
  let returnResponse: jest.Mocked<ReturnResponse>;

  beforeEach(() => {
    handlersError = {
      returnErrorRes: jest.fn(),
      returnErrorRepository: jest.fn(),
      returnData: jest.fn(),
    } as any;

    repository = {
      $_getResultTocByConfig: jest.fn(),
      getAllOutcomeByInitiative: jest.fn(),
      getAllTocResultsByInitiative: jest.fn(),
      getFullInitiativeTocByResult: jest.fn(),
      getFullInitiativeTocByInitiative: jest.fn(),
      $_getResultTocByConfigV2: jest.fn(),
      getAllTocResultsByInitiativeV2: jest.fn(),
    } as any;

    returnResponse = {
      format: jest.fn(),
    } as any;

    service = new TocResultsService(handlersError, repository, returnResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findTocResultByConfig', () => {
    it('returns formatted response when records exist', async () => {
      const repoResult = [{ id: 1 }];
      const formattedResponse = {
        response: repoResult,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      };
      repository.$_getResultTocByConfig.mockResolvedValue(repoResult);
      returnResponse.format.mockReturnValue(formattedResponse as any);

      const result = await service.findTocResultByConfig(1, 2, 3);

      expect(repository.$_getResultTocByConfig).toHaveBeenCalledWith(1, 2, 3);
      expect(returnResponse.format).toHaveBeenCalledWith({
        message: 'Successful response',
        response: repoResult,
        statusCode: HttpStatus.OK,
      });
      expect(result).toBe(formattedResponse);
    });

    it('falls back to getAllOutcomeByInitiative when level is 4 and no data', async () => {
      repository.$_getResultTocByConfig.mockResolvedValue([]);
      repository.getAllOutcomeByInitiative.mockResolvedValue([
        { toc_result_id: 9 },
      ] as any);
      returnResponse.format.mockReturnValue({
        response: [{ toc_result_id: 9 }],
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      } as any);

      await service.findTocResultByConfig(1, 2, 4);

      expect(repository.getAllOutcomeByInitiative).toHaveBeenCalledWith(4);
    });

    it('formats error via ReturnResponse on failure', async () => {
      const error = new Error('boom');
      repository.$_getResultTocByConfig.mockRejectedValue(error);

      await service.findTocResultByConfig(1, 2, 3);

      expect(returnResponse.format).toHaveBeenCalledWith(error, true);
    });
  });

  describe('findAllByinitiativeId', () => {
    it('calls handlersError when no data', async () => {
      const handled = { message: 'handled' } as any;
      repository.getAllTocResultsByInitiative.mockResolvedValue([]);
      handlersError.returnErrorRes.mockReturnValue(handled);

      const result = await service.findAllByinitiativeId(5, 2);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({
        error: expect.any(Object),
      });
      expect(result).toBe(handled);
    });
  });

  describe('findFullInitiativeTocByResult', () => {
    it('returns data when available', async () => {
      const data = [{ id: 1 }];
      repository.getFullInitiativeTocByResult.mockResolvedValue(data);

      const result = await service.findFullInitiativeTocByResult(10);

      expect(result).toEqual({
        response: data,
        message: 'Successful response',
        status: HttpStatus.OK,
      });
    });

    it('delegates error when empty', async () => {
      const handled = { message: 'handled' } as any;
      repository.getFullInitiativeTocByResult.mockResolvedValue([]);
      handlersError.returnErrorRes.mockReturnValue(handled);

      const result = await service.findFullInitiativeTocByResult(10);

      expect(result).toBe(handled);
    });
  });

  describe('findFullInitiativeTocByInitiative', () => {
    it('returns data when available', async () => {
      const data = [{ id: 1 }];
      repository.getFullInitiativeTocByInitiative.mockResolvedValue(data);

      const result = await service.findFullInitiativeTocByInitiative(12);

      expect(result.status).toBe(HttpStatus.OK);
    });

    it('delegates error when empty', async () => {
      const handled = { message: 'handled' } as any;
      repository.getFullInitiativeTocByInitiative.mockResolvedValue([]);
      handlersError.returnErrorRes.mockReturnValue(handled);

      const result = await service.findFullInitiativeTocByInitiative(12);

      expect(result).toBe(handled);
    });
  });

  describe('findTocResultByConfigV2', () => {
    it('returns formatted response', async () => {
      const data = [{ id: 1 }];
      const formattedResponse = {
        response: data,
        message: 'Successful response',
        statusCode: HttpStatus.OK,
      };
      repository.$_getResultTocByConfigV2.mockResolvedValue(data);
      returnResponse.format.mockReturnValue(formattedResponse as any);

      const result = await service.findTocResultByConfigV2(1, 2, 3);

      expect(returnResponse.format).toHaveBeenCalledWith({
        message: 'Successful response',
        response: data,
        statusCode: HttpStatus.OK,
      });
      expect(result).toBe(formattedResponse);
    });

    it('formats error when repository fails', async () => {
      const error = new Error('fail');
      repository.$_getResultTocByConfigV2.mockRejectedValue(error);

      await service.findTocResultByConfigV2(1, 2, 3);

      expect(returnResponse.format).toHaveBeenCalledWith(error, true);
    });
  });

  describe('findAllByinitiativeIdV2', () => {
    it('delegates error when empty', async () => {
      const handled = { message: 'handled' } as any;
      repository.getAllTocResultsByInitiativeV2.mockResolvedValue([]);
      handlersError.returnErrorRes.mockReturnValue(handled);

      const result = await service.findAllByinitiativeIdV2(5, 2);

      expect(result).toBe(handled);
    });

    it('delegates repository failure to handlers', async () => {
      const error = new Error('fail');
      repository.getAllTocResultsByInitiativeV2.mockRejectedValue(error);
      handlersError.returnErrorRes.mockReturnValue({ handled: true } as any);

      const result = await service.findAllByinitiativeIdV2(5, 2);

      expect(handlersError.returnErrorRes).toHaveBeenCalledWith({ error });
      expect(result).toEqual({ handled: true });
    });
  });
});
