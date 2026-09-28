import { CurrentResultService } from './current-result.service';
import { of, throwError } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';

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
      },
      fieldsManagerSE: {
        inIpsr: {
          set: jest.fn()
        }
      }
    };

    mockRolesService = {
      validateReadOnly: jest.fn()
    };

    mockResultLevelService = {
      currentResultLevelName: '',
      currentResultLevelId: '',
      currentResultLevelIdSignal: {
        set: jest.fn()
      },
      currentResultTypeId: ''
    };

    mockDataControlService = {
      currentResult: null,
      currentResultSignal: {
        set: jest.fn()
      }
    };

    mockRouter = {
      navigate: jest.fn()
    };

    service = new CurrentResultService(mockResultLevelService, mockApiService, mockRolesService, mockDataControlService, mockRouter);
  });

  // Night sweep 2026-09-23, W12B-2: the async roles check ended with `readOnly = false` for a
  // Science Program member AFTER the status lock, so a SUBMITTED result opened editable.
  // Control negative: without the deferred re-apply this test fails.
  it('W12B-2: keeps a SUBMITTED result read-only after the async roles check resolves for a member', async () => {
    const response = { is_phase_open: 1, status_id: 3, result_type_id: 1, is_discontinued: false, initiative_id: 50 };
    let resolveRoles: () => void;
    mockRolesService.validateReadOnly.mockImplementation(
      () =>
        new Promise<void>(res => {
          resolveRoles = () => {
            mockApiService.rolesSE.readOnly = false; // what validateReadOnly does for a member
            res();
          };
        })
    );
    mockDataControlService.currentResultSignal.set.mockImplementation(() => undefined);
    mockApiService.resultsSE.GET_resultById.mockReturnValue(of({ response }));

    service.GET_resultById();
    expect(mockApiService.rolesSE.readOnly).toBe(true);

    resolveRoles!();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockApiService.rolesSE.readOnly).toBe(true);
  });

  // Re-validation 24-Sep-2026 (NS-30): Contributors & partners re-fetches the result and replaces
  // `currentResult` with a NEW object of the same result before the roles check settles. Control
  // negative: with the old identity check (`currentResult === response`) this test fails.
  it('NS-30: re-applies the lock when a section replaced currentResult with a new object of the same result', async () => {
    const response = { id: 8916, is_phase_open: 1, status_id: 3, result_type_id: 1, is_discontinued: false, initiative_id: 50 };
    let resolveRoles: () => void;
    mockRolesService.validateReadOnly.mockImplementation(
      () =>
        new Promise<void>(res => {
          resolveRoles = () => {
            mockApiService.rolesSE.readOnly = false;
            res();
          };
        })
    );
    mockDataControlService.currentResultSignal.set.mockImplementation(() => undefined);
    mockApiService.resultsSE.GET_resultById.mockReturnValue(of({ response }));

    service.GET_resultById();
    mockDataControlService.currentResult = { ...response }; // rd-contributors-and-partners re-fetch
    resolveRoles!();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockApiService.rolesSE.readOnly).toBe(true);
  });

  it('NS-30: leaves the lock alone when another result was opened meanwhile', async () => {
    const response = { id: 8916, is_phase_open: 1, status_id: 3, result_type_id: 1, is_discontinued: false, initiative_id: 50 };
    let resolveRoles: () => void;
    mockRolesService.validateReadOnly.mockImplementation(
      () =>
        new Promise<void>(res => {
          resolveRoles = () => {
            mockApiService.rolesSE.readOnly = false;
            res();
          };
        })
    );
    mockDataControlService.currentResultSignal.set.mockImplementation(() => undefined);
    mockApiService.resultsSE.GET_resultById.mockReturnValue(of({ response }));

    service.GET_resultById();
    mockDataControlService.currentResult = { id: 9999, status_id: 1, is_phase_open: 1 };
    resolveRoles!();
    await Promise.resolve();
    await Promise.resolve();

    expect(mockApiService.rolesSE.readOnly).toBe(false);
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

    service.GET_resultById();

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

    mockApiService.resultsSE.GET_resultById.mockReturnValue(throwError(() => error));

    service.GET_resultById();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    expect(mockApiService.alertsFe.show).toHaveBeenCalledWith({
      id: 'reportResultError',
      title: 'Error!',
      description: 'Result not found.',
      status: 'error'
    });
  });

  it('should handle is_phase_open = 1 when getting result by id', fakeAsync(() => {
    const response = {
      result_level_name: 'level1',
      result_level_id: 'id1',
      result_type_id: 'type1',
      is_phase_open: 1,
      status_id: 2,
      is_discontinued: true
    };

    mockApiService.resultsSE.GET_resultById.mockReturnValue(of({ response }));

    service.GET_resultById();
    tick();

    expect(mockApiService.rolesSE.readOnly).toBe(true);
  }));

  it('should handle is_phase_open = 1 and status_id = 1 when getting result by id', fakeAsync(() => {
    const response = {
      result_level_name: 'level1',
      result_level_id: 'id1',
      result_type_id: 'type1',
      is_phase_open: 1,
      status_id: 1,
      is_discontinued: false
    };

    mockApiService.resultsSE.GET_resultById.mockReturnValue(of({ response }));

    service.GET_resultById();
    tick();

    expect(mockApiService.rolesSE.readOnly).toBe(false);
  }));

  it('should not set readOnly from is_discontinued when result is innovation use (type 2) and phase is open', fakeAsync(() => {
    mockApiService.rolesSE.readOnly = false;
    const response = {
      result_level_name: 'level1',
      result_level_id: 'id1',
      result_type_id: 2,
      is_phase_open: 1,
      status_id: 1,
      is_discontinued: true
    };

    mockApiService.resultsSE.GET_resultById.mockReturnValue(of({ response }));

    service.GET_resultById();
    tick();

    expect(mockApiService.rolesSE.readOnly).toBe(false);
  }));

  it('should force readOnly when result primary initiative is AVISA', fakeAsync(() => {
    mockApiService.rolesSE.readOnly = false;
    mockApiService.rolesSE.isAdmin = true;
    const response = {
      result_level_name: 'level1',
      result_level_id: 'id1',
      result_type_id: 'type1',
      is_phase_open: 1,
      status_id: 1,
      is_discontinued: false,
      initiative_id: 41,
      initiative_official_code: 'SGP-02'
    };

    mockApiService.resultsSE.GET_resultById.mockReturnValue(of({ response }));

    service.GET_resultById();
    tick();

    expect(mockApiService.rolesSE.readOnly).toBe(true);
  }));
});
