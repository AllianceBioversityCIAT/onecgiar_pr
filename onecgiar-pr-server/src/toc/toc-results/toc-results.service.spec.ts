import { HttpStatus } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { TocResultsRepository } from './toc-results.repository';
import { ResultRepository } from '../../api/results/result.repository';
import { YearRepository } from '../../api/results/years/year.repository';

describe('TocResultsService', () => {
  let service: TocResultsService;
  let handlersError: jest.Mocked<HandlersError>;
  let repository: jest.Mocked<TocResultsRepository>;
  let returnResponse: jest.Mocked<ReturnResponse>;
  let resultRepository: jest.Mocked<ResultRepository>;
  let yearRepository: jest.Mocked<YearRepository>;
  let resultRecord: any;
  let yearRecord: any;

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
      getTocIndicatorsByResultIds: jest.fn(),
      getResultIndicatorMappings: jest.fn(),
      getAllTocResultsByInitiativeV2: jest.fn(),
    } as any;
    repository.getTocIndicatorsByResultIds.mockResolvedValue([]);
    repository.getResultIndicatorMappings.mockResolvedValue([]);

    returnResponse = {
      format: jest.fn(),
    } as any;

    resultRecord = {
      id: 1,
      version_id: 2,
      result_type_id: 7,
      obj_version: { id: 3, phase_year: 2030 },
    };
    yearRecord = { year: 2030 };

    resultRepository = {
      findOne: jest.fn().mockResolvedValue(resultRecord),
    } as any;

    yearRepository = {
      findOne: jest.fn().mockResolvedValue(yearRecord),
    } as any;

    service = new TocResultsService(
      handlersError,
      repository,
      returnResponse,
      resultRepository,
      yearRepository,
    );
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
      const data = [{ toc_result_id: 10, title: 'Result' }];
      const indicatorRows = [
        {
          toc_result_id: 10,
          indicator_id: 900,
          toc_result_indicator_id: 'IND-1',
          related_node_id: 'NODE-1',
          indicator_description: 'Indicator desc',
          unit_messurament: 'Households',
          type_value: 'Number',
          type_name: 'Quantitative',
          location: 'Global',
          target_value: 15,
        },
      ];
      repository.getTocIndicatorsByResultIds.mockResolvedValue(indicatorRows);
      const mappingRows = [
        {
          toc_result_id: 10,
          result_toc_result_id: 500,
          planned_result: true,
          toc_progressive_narrative: 'Narrative',
          result_toc_result_indicator_id: 700,
          toc_results_indicator_id: 'NODE-1',
          indicator_contributing: 4,
          indicator_status: 2,
        },
      ];
      repository.getResultIndicatorMappings.mockResolvedValue(mappingRows);
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
        response: [
          {
            ...data[0],
            result_toc_result_id: 500,
            planned_result: true,
            toc_progressive_narrative: 'Narrative',
            indicators: [
              {
                indicator_id: 900,
                toc_result_indicator_id: 'IND-1',
                related_node_id: 'NODE-1',
                indicator_description: 'Indicator desc',
                unit_messurament: 'Households',
                type_value: 'Number',
                type_name: 'Quantitative',
                location: 'Global',
                result_toc_result_indicator_id: 700,
                indicator_contributing: 4,
                status_id: 2,
                target_value: 15,
                targets: [{ target_value: 15 }],
              },
            ],
          },
        ],
        statusCode: HttpStatus.OK,
      });
      expect(repository.getTocIndicatorsByResultIds).toHaveBeenCalledWith(
        resultRecord,
        yearRecord,
        [10],
        7,
        ['NODE-1'],
      );
      expect(repository.getResultIndicatorMappings).toHaveBeenCalledWith(1, 2, [
        10,
      ]);
      expect(result).toBe(formattedResponse);
    });

    it('returns indicator metadata with null mapping when no links exist', async () => {
      const data = [{ toc_result_id: 20, title: 'Result B' }];
      const indicatorRows = [
        {
          toc_result_id: 20,
          indicator_id: 901,
          toc_result_indicator_id: 'IND-2',
          related_node_id: 'NODE-2',
          indicator_description: 'Indicator B',
          unit_messurament: 'Sessions',
          type_value: 'Qualitative',
          type_name: 'Narrative',
          location: 'Regional',
          target_value: null,
        },
      ];
      repository.$_getResultTocByConfigV2.mockResolvedValue(data);
      repository.getTocIndicatorsByResultIds.mockResolvedValue(indicatorRows);
      repository.getResultIndicatorMappings.mockResolvedValue([]);
      returnResponse.format.mockReturnValue({} as any);

      await service.findTocResultByConfigV2(4, 5, 1);

      expect(returnResponse.format).toHaveBeenCalledWith({
        message: 'Successful response',
        response: [
          {
            ...data[0],
            result_toc_result_id: null,
            planned_result: null,
            toc_progressive_narrative: null,
            indicators: [
              {
                indicator_id: 901,
                toc_result_indicator_id: 'IND-2',
                related_node_id: 'NODE-2',
                indicator_description: 'Indicator B',
                unit_messurament: 'Sessions',
                type_value: 'Qualitative',
                type_name: 'Narrative',
                location: 'Regional',
                result_toc_result_indicator_id: null,
                indicator_contributing: null,
                status_id: null,
                target_value: null,
                targets: [{ target_value: null }],
              },
            ],
          },
        ],
        statusCode: HttpStatus.OK,
      });
      expect(repository.getTocIndicatorsByResultIds).toHaveBeenCalledWith(
        resultRecord,
        yearRecord,
        [20],
        7,
        [],
      );
      expect(repository.getResultIndicatorMappings).toHaveBeenCalledWith(4, 5, [
        20,
      ]);
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
