import { CurrentResultService } from './current-result.service';
import { of, throwError } from 'rxjs';

describe('CurrentResultService', () => {
  let service: CurrentResultService;
  let mockApiService, mockRolesService, mockResultLevelService, mockDataControlService, mockRouter;

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        GET_resultById: jest.fn()
      },
      rolesSE: {
        readOnly: false,
        isAdmin: false
      },
      alertsFe: {
        show: jest.fn()
      }
    };

    mockRolesService = {
      validateReadOnly: jest.fn()
    };

    mockResultLevelService = {
      currentResultLevelName: '',
      currentResultLevelId: '',
      currentResultTypeId: ''
    };

    mockDataControlService = {
      currentResult: null
    };

    mockRouter = {
      navigate: jest.fn()
    };

    service = new CurrentResultService(mockResultLevelService, mockApiService, mockRolesService, mockDataControlService, mockRouter);
  });

  it('should get result by id successfully', async () => {
    const response = {
      result_level_name: 'level1',
      result_level_id: 'id1',
      result_type_id: 'type1',
      is_phase_open: 0,
      status_id: 1,
      is_discontinued: false
    };

    mockApiService.resultsSE.GET_resultById.mockReturnValue(of({ response }));

    await service.GET_resultById();

    expect(mockRolesService.validateReadOnly).toHaveBeenCalledWith(response);
    expect(mockResultLevelService.currentResultLevelName).toBe(response.result_level_name);
    expect(mockResultLevelService.currentResultLevelId).toBe(response.result_level_id);
    expect(mockResultLevelService.currentResultTypeId).toBe(response.result_type_id);
    expect(mockDataControlService.currentResult).toBe(response);
  });

  it('should handle error when getting result by id', async () => {
    const error = {
      error: {
        statusCode: 404
      }
    };

    mockApiService.resultsSE.GET_resultById.mockReturnValue(throwError(error));

    await service.GET_resultById();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
      id: 'reportResultError',
      title: 'Error!',
      description: 'Result not found.',
      status: 'error'
    });
  });
});
