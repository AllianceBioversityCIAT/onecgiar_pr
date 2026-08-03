import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { BilateralAutoSaveService } from './bilateral-auto-save.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';

describe('BilateralAutoSaveService', () => {
  let service: BilateralAutoSaveService;
  let mockBilateralApi: jest.Mocked<
    Pick<
      BilateralApiService,
      | 'PATCH_generalInfo'
      | 'PATCH_plannedResult'
      | 'PATCH_tocMapping'
      | 'PATCH_contributors'
      | 'PATCH_geographic'
      | 'GET_tocState'
    >
  >;

  beforeEach(() => {
    mockBilateralApi = {
      PATCH_generalInfo: jest.fn().mockReturnValue(of({})),
      PATCH_plannedResult: jest.fn().mockReturnValue(of({})),
      PATCH_tocMapping: jest.fn().mockReturnValue(of({})),
      PATCH_contributors: jest.fn().mockReturnValue(of({})),
      PATCH_geographic: jest.fn().mockReturnValue(of({})),
      GET_tocState: jest.fn().mockReturnValue(of({ response: {} })),
    };

    TestBed.configureTestingModule({
      providers: [
        BilateralAutoSaveService,
        { provide: BilateralApiService, useValue: mockBilateralApi },
      ],
    });

    service = TestBed.inject(BilateralAutoSaveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register a field', () => {
    service.registerField('title', 'text');
    expect(service.fieldStatus()['title']).toBe('idle');
  });

  it('should set saving status on text field update', () => {
    service.registerField('title', 'text');
    service.updateField('title', 'New Title', 'text');
    expect(service.fieldStatus()['title']).toBe('saving');
  });

  it('should reset all state', () => {
    service.registerField('title', 'text');
    service.updateField('title', 'New Title', 'text');
    service.reset();
    expect(service.fieldStatus()).toEqual({});
    expect(service.hasPendingSaves()).toBe(false);
  });

  it('should set result id', () => {
    service.setResultId(42);
    expect(service.hasPendingSaves()).toBe(false);
  });

  it('should flush general-info via PATCH_generalInfo', () => {
    service.setResultId(42);
    service.updateFieldsBatch({ title: 'Hello' });
    expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(42, { title: 'Hello' });
  });

  it('should save contributors via PATCH_contributors', () => {
    service.setResultId(7);
    service.saveContributors({ contributing_center: [{ institution_id: 1 }] });
    expect(mockBilateralApi.PATCH_contributors).toHaveBeenCalledWith(7, {
      contributing_center: [{ institution_id: 1 }],
    });
  });

  it('should debounce geography schedulePayload and send latest body', fakeAsync(() => {
    service.setResultId(5);
    service.schedulePayload('geography', { geo_scope_id: 1 }, { debounceMs: 500, statusKey: 'geography' });
    service.schedulePayload('geography', { geo_scope_id: 2 }, { debounceMs: 500, statusKey: 'geography' });
    expect(mockBilateralApi.PATCH_geographic).not.toHaveBeenCalled();
    tick(500);
    expect(mockBilateralApi.PATCH_geographic).toHaveBeenCalledTimes(1);
    expect(mockBilateralApi.PATCH_geographic).toHaveBeenCalledWith(5, { geo_scope_id: 2 });
  }));

  it('should coalesce in-flight contributors to latest payload', fakeAsync(() => {
    const first$ = new Subject<unknown>();
    mockBilateralApi.PATCH_contributors.mockReturnValueOnce(first$).mockReturnValue(of({}));

    service.setResultId(9);
    service.schedulePayload(
      'contributors',
      { contributing_center: [{ institution_id: 1 }] },
      { debounceMs: 0, statusKey: 'contributors' }
    );
    service.schedulePayload(
      'contributors',
      { contributing_center: [{ institution_id: 2 }] },
      { debounceMs: 0, statusKey: 'contributors' }
    );

    expect(mockBilateralApi.PATCH_contributors).toHaveBeenCalledTimes(1);
    expect(mockBilateralApi.PATCH_contributors).toHaveBeenCalledWith(9, {
      contributing_center: [{ institution_id: 1 }],
    });

    first$.next({});
    first$.complete();
    tick();

    expect(mockBilateralApi.PATCH_contributors).toHaveBeenCalledTimes(2);
    expect(mockBilateralApi.PATCH_contributors).toHaveBeenLastCalledWith(9, {
      contributing_center: [{ institution_id: 2 }],
    });
  }));

  it('should ignore stale responses after reset', fakeAsync(() => {
    const pending$ = new Subject<unknown>();
    mockBilateralApi.PATCH_geographic.mockReturnValue(pending$);

    service.setResultId(1);
    service.schedulePayload('geography', { geo_scope_id: 1 }, { debounceMs: 0, statusKey: 'geography' });
    service.reset();
    pending$.next({});
    pending$.complete();
    tick(2100);

    expect(service.fieldStatus()['geography']).toBeUndefined();
  }));

  it('should flush pending geography payloads immediately', fakeAsync(() => {
    service.setResultId(3);
    service.schedulePayload('geography', { geo_scope_id: 4 }, { debounceMs: 500, statusKey: 'geography' });
    void service.flush();
    expect(mockBilateralApi.PATCH_geographic).toHaveBeenCalledWith(3, { geo_scope_id: 4 });
    tick(500);
    expect(mockBilateralApi.PATCH_geographic).toHaveBeenCalledTimes(1);
  }));

  it('should schedule typeSpecific via custom executor', fakeAsync(() => {
    const executor = jest.fn().mockReturnValue(of({}));
    service.setResultId(11);
    service.schedulePayload('typeSpecific', { female_using: 1 }, {
      debounceMs: 800,
      statusKey: 'type-specific',
      executor,
    });
    expect(executor).not.toHaveBeenCalled();
    tick(800);
    expect(executor).toHaveBeenCalledWith(11, { female_using: 1 });
  }));
});
