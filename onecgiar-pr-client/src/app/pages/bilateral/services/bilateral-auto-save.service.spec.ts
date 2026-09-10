import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BilateralAutoSaveService } from './bilateral-auto-save.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';

describe('BilateralAutoSaveService explicit section persistence', () => {
  let service: BilateralAutoSaveService;
  const bilateralApi = {
    PATCH_generalInfo: jest.fn().mockReturnValue(of({})),
    PATCH_plannedResult: jest.fn().mockReturnValue(of({})),
    PATCH_tocMapping: jest.fn().mockReturnValue(of({})),
    PATCH_contributors: jest.fn().mockReturnValue(of({})),
    PATCH_geographic: jest.fn().mockReturnValue(of({})),
    GET_tocState: jest.fn().mockReturnValue(of({ response: {} })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [BilateralAutoSaveService, { provide: BilateralApiService, useValue: bilateralApi }],
    });
    service = TestBed.inject(BilateralAutoSaveService);
    service.setResultId(42);
  });

  it('stages field changes without issuing a request', () => {
    service.updateField('title', 'Local title', 'text');

    expect(bilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
    expect(service.fieldStatus()['title']).toBe('dirty');
    expect(service.hasPendingFor('general-info')).toBe(true);
  });

  it('persists only the requested section with the pre-existing payload shape', async () => {
    service.updateFieldsBatch({ title: 'Title', description: 'Description' });
    service.saveContributors({ contributing_center: [{ institution_id: 10 }] });

    await service.flush(service.getEndpointKeys('general-info'));

    expect(bilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(42, { title: 'Title', description: 'Description' });
    expect(bilateralApi.PATCH_contributors).not.toHaveBeenCalled();
    expect(service.hasPendingFor('contributors')).toBe(true);
  });

  it('keeps structured payloads local until their section is explicitly saved', async () => {
    service.saveTocMapping({ planned_result: false, toc_progressive_narrative: 'Reason' });

    expect(bilateralApi.PATCH_tocMapping).not.toHaveBeenCalled();
    await service.flush(service.getEndpointKeys('contributors'));

    expect(bilateralApi.PATCH_tocMapping).toHaveBeenCalledWith(42, {
      result_toc_result: { planned_result: false, toc_progressive_narrative: 'Reason' },
    });
  });

  it('retains failed section state for a retry', async () => {
    bilateralApi.PATCH_generalInfo.mockReturnValueOnce(throwError(() => new Error('network'))).mockReturnValueOnce(of({}));
    service.updateField('title', 'Retry me');

    await service.flush(service.getEndpointKeys('general-info'));
    expect(service.hasErrorFor('general-info')).toBe(true);

    service.updateField('title', 'Retry me');
    await service.flush(service.getEndpointKeys('general-info'));
    expect(bilateralApi.PATCH_generalInfo).toHaveBeenCalledTimes(2);
  });

  it('does not permit writes after the form becomes read-only', async () => {
    service.setReadOnly(true);
    service.updateField('title', 'Blocked');
    await service.flush(service.getEndpointKeys('general-info'));

    expect(bilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
  });
});
