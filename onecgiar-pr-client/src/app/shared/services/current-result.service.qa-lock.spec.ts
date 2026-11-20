import { CurrentResultService } from './current-result.service';
import { of } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';

/**
 * QA review lock: a result QA holds (`inQA = 1`, open phase) opens read-only for everyone,
 * admins included. Before the fix an admin got every section editable (prtest, timeline 40).
 */
describe('CurrentResultService — QA review lock', () => {
  let service: CurrentResultService;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      resultsSE: { GET_resultById: jest.fn() },
      rolesSE: { readOnly: false, isAdmin: true },
      alertsFe: { show: jest.fn() },
      fieldsManagerSE: { inIpsr: { set: jest.fn() } }
    };
    const mockResultLevelService: any = {
      currentResultLevelIdSignal: { set: jest.fn() }
    };
    const mockDataControlService: any = { currentResult: null, currentResultSignal: { set: jest.fn() } };
    service = new CurrentResultService(mockResultLevelService, mockApiService, { validateReadOnly: jest.fn() } as any, mockDataControlService, {
      navigate: jest.fn()
    } as any);
  });

  const open = (extra: Record<string, unknown>) => {
    mockApiService.resultsSE.GET_resultById.mockReturnValue(
      of({ response: { id: 12619, result_type_id: 1, is_discontinued: false, initiative_id: 54, ...extra } })
    );
    service.GET_resultById();
    tick();
  };

  it('forces read-only for an admin when the result is In QA in an open phase', fakeAsync(() => {
    open({ is_phase_open: 1, status_id: 3, inQA: 1 });
    expect(mockApiService.rolesSE.readOnly).toBe(true);
  }));

  it('keeps an admin editable on a submitted result that QA does not hold', fakeAsync(() => {
    open({ is_phase_open: 1, status_id: 3, inQA: 0 });
    expect(mockApiService.rolesSE.readOnly).toBe(false);
  }));
});
