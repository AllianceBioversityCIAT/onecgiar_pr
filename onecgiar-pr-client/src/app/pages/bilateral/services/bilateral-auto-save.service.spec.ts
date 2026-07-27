import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BilateralAutoSaveService } from './bilateral-auto-save.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';

describe('BilateralAutoSaveService', () => {
  let service: BilateralAutoSaveService;
  let mockBilateralApi: jest.Mocked<Pick<
    BilateralApiService,
    'PATCH_generalInfo' | 'PATCH_plannedResult' | 'PATCH_tocMapping' | 'PATCH_contributors' | 'GET_tocState'
  >>;

  beforeEach(() => {
    mockBilateralApi = {
      PATCH_generalInfo: jest.fn().mockReturnValue(of({})),
      PATCH_plannedResult: jest.fn().mockReturnValue(of({})),
      PATCH_tocMapping: jest.fn().mockReturnValue(of({})),
      PATCH_contributors: jest.fn().mockReturnValue(of({})),
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

  afterEach(() => {
    jest.useRealTimers();
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

  // -------------------------------------------------------------------------

  describe('globalSaveState', () => {
    it('is idle with no registered field', () => {
      expect(service.globalSaveState()).toBe('idle');
    });

    it('is saving while any field is in flight', () => {
      service.fieldStatus.set({ a: 'idle', b: 'saving', c: 'error' });
      expect(service.globalSaveState()).toBe('saving');
    });

    it('is error when a field failed and none is in flight', () => {
      service.fieldStatus.set({ a: 'saved', b: 'error' });
      expect(service.globalSaveState()).toBe('error');
    });

    it('is saved once every field settled', () => {
      service.fieldStatus.set({ a: 'saved', b: 'idle' });
      expect(service.globalSaveState()).toBe('saved');
    });
  });

  describe('updateField', () => {
    it('debounces text fields for 800ms and only saves once', () => {
      jest.useFakeTimers();
      service.setResultId(1);

      service.updateField('title', 'A', 'text');
      service.updateField('title', 'AB', 'text');
      expect(mockBilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();

      jest.advanceTimersByTime(800);
      expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledTimes(1);
      expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(1, { title: 'AB' });
    });

    it('saves selects and checkboxes immediately', () => {
      service.setResultId(1);
      service.updateField('gender_tag_level_id', 2, 'select');
      expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(1, { gender_tag_level_id: 2 });

      service.updateField('planned_result', true, 'checkbox');
      expect(mockBilateralApi.PATCH_plannedResult).toHaveBeenCalledWith(1, { planned_result: true });
    });

    it('defaults to the debounced text behaviour', () => {
      jest.useFakeTimers();
      service.setResultId(1);
      service.updateField('description', 'text body');
      expect(mockBilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
      jest.advanceTimersByTime(800);
      expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(1, { description: 'text body' });
    });
  });

  describe('notifyBlur', () => {
    it('flushes after the blur debounce', () => {
      jest.useFakeTimers();
      service.setResultId(1);
      service.notifyBlur('title', 'Blurred');
      jest.advanceTimersByTime(50);
      expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(1, { title: 'Blurred' });
    });

    it('cancels the pending text debounce so the field is saved only once', () => {
      jest.useFakeTimers();
      service.setResultId(1);
      service.updateField('title', 'Typed', 'text');
      service.notifyBlur('title', 'Typed');

      jest.advanceTimersByTime(1000);
      expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('flush', () => {
    it('does nothing without a result id', async () => {
      service.updateFieldsBatch({ title: 'Hello' });
      await service.flush();
      expect(mockBilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
    });

    it('does nothing when there is nothing pending', async () => {
      service.setResultId(1);
      await service.flush();
      expect(mockBilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
    });

    it('groups fields of the same endpoint into a single call', () => {
      service.setResultId(1);
      service.updateFieldsBatch({ title: 'T', description: 'D' });
      expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledTimes(1);
      expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(1, { title: 'T', description: 'D' });
    });

    it('splits fields across their endpoints', () => {
      service.setResultId(1);
      service.updateFieldsBatch({ title: 'T', programCode: 'P11', toc_mapping: {}, contributors: [] });
      expect(mockBilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(1, { title: 'T' });
      expect(mockBilateralApi.PATCH_plannedResult).toHaveBeenCalledWith(1, { programCode: 'P11' });
      expect(mockBilateralApi.PATCH_tocMapping).toHaveBeenCalledWith(1, { toc_mapping: {} });
      expect(mockBilateralApi.PATCH_contributors).toHaveBeenCalledWith(1, { contributors: [] });
    });

    it('skips fields that have no endpoint mapped', () => {
      service.setResultId(1);
      service.updateFieldsBatch({ unknown_field: 'x' });
      expect(mockBilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
      expect(service.fieldStatus()['unknown_field']).toBe('saving');
    });

    it('marks the batch as saved and reverts it to idle', () => {
      jest.useFakeTimers();
      service.setResultId(1);
      service.updateFieldsBatch({ title: 'T' });
      expect(service.fieldStatus()['title']).toBe('saved');

      jest.advanceTimersByTime(2000);
      expect(service.fieldStatus()['title']).toBe('idle');
    });

    it('does not revert a field that changed status after being saved', () => {
      jest.useFakeTimers();
      service.setResultId(1);
      service.updateFieldsBatch({ title: 'T' });
      service.fieldStatus.update(s => ({ ...s, title: 'saving' }));

      jest.advanceTimersByTime(2000);
      expect(service.fieldStatus()['title']).toBe('saving');
    });

    it('marks the batch as error when the request fails', () => {
      mockBilateralApi.PATCH_generalInfo.mockReturnValue(throwError(() => new Error('nope')));
      service.setResultId(1);
      service.updateFieldsBatch({ title: 'T', description: 'D' });
      expect(service.fieldStatus()['title']).toBe('error');
      expect(service.fieldStatus()['description']).toBe('error');
    });

    it('marks the batch as error when the request throws synchronously', () => {
      mockBilateralApi.PATCH_generalInfo.mockImplementation(() => {
        throw new Error('exploded');
      });
      service.setResultId(1);
      service.updateFieldsBatch({ title: 'T' });
      expect(service.fieldStatus()['title']).toBe('error');
    });
  });

  describe('reset', () => {
    it('clears pending debounce timers so nothing is saved afterwards', () => {
      jest.useFakeTimers();
      service.setResultId(1);
      service.updateField('title', 'T', 'text');
      service.reset();

      jest.advanceTimersByTime(2000);
      expect(mockBilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
    });
  });

  describe('saveTocMapping', () => {
    it('does nothing without a result id', () => {
      service.saveTocMapping({ toc_level_id: 1 });
      expect(mockBilateralApi.PATCH_tocMapping).not.toHaveBeenCalled();
    });

    it('builds the full payload including the indicator target', () => {
      service.setResultId(3);
      service.saveTocMapping({
        planned_result: true,
        toc_level_id: '2',
        toc_result_id: '55',
        toc_progressive_narrative: 'narrative',
        indicator_id: 77,
        contributing_indicator: '4',
      });

      expect(mockBilateralApi.PATCH_tocMapping).toHaveBeenCalledWith(3, {
        result_toc_result: {
          planned_result: true,
          result_toc_results: [
            {
              toc_level_id: 2,
              toc_result_id: 55,
              toc_progressive_narrative: 'narrative',
              indicators: [{ id: '77', targets: [{ targetId: 0, contributing_indicator: 4 }] }],
            },
          ],
        },
      });
      expect(service.fieldStatus()['toc_mapping']).toBe('saved');
    });

    it('omits the indicators block when there is no indicator', () => {
      service.setResultId(3);
      service.saveTocMapping({ toc_level_id: 0, toc_result_id: 0 });

      const body = mockBilateralApi.PATCH_tocMapping.mock.calls[0][1] as any;
      expect(body.result_toc_result.planned_result).toBe(true);
      expect(body.result_toc_result.result_toc_results[0].toc_level_id).toBeUndefined();
      expect(body.result_toc_result.result_toc_results[0].toc_result_id).toBeUndefined();
      expect(body.result_toc_result.result_toc_results[0].indicators).toBeUndefined();
    });

    it('sends an empty target list when there is no contribution value', () => {
      service.setResultId(3);
      service.saveTocMapping({ indicator_id: '9', contributing_indicator: null as any });

      const body = mockBilateralApi.PATCH_tocMapping.mock.calls[0][1] as any;
      expect(body.result_toc_result.result_toc_results[0].indicators[0].targets).toEqual([]);
    });

    it('keeps planned_result false when explicitly set', () => {
      service.setResultId(3);
      service.saveTocMapping({ planned_result: false });
      const body = mockBilateralApi.PATCH_tocMapping.mock.calls[0][1] as any;
      expect(body.result_toc_result.planned_result).toBe(false);
    });

    it('reverts the saved badge to idle', () => {
      jest.useFakeTimers();
      service.setResultId(3);
      service.saveTocMapping({});
      expect(service.fieldStatus()['toc_mapping']).toBe('saved');
      jest.advanceTimersByTime(2000);
      expect(service.fieldStatus()['toc_mapping']).toBe('idle');
    });

    it('flags an error when the request fails', () => {
      mockBilateralApi.PATCH_tocMapping.mockReturnValue(throwError(() => new Error('nope')));
      service.setResultId(3);
      service.saveTocMapping({});
      expect(service.fieldStatus()['toc_mapping']).toBe('error');
    });
  });

  describe('saveContributors', () => {
    it('does nothing without a result id', () => {
      service.saveContributors({ contributing_center: [] });
      expect(mockBilateralApi.PATCH_contributors).not.toHaveBeenCalled();
    });

    it('marks the section saved and then idle', () => {
      jest.useFakeTimers();
      service.setResultId(7);
      service.saveContributors({ contributing_bilateral_projects: [{ project_id: 1, is_lead: true }] });
      expect(service.fieldStatus()['contributors']).toBe('saved');
      jest.advanceTimersByTime(2000);
      expect(service.fieldStatus()['contributors']).toBe('idle');
    });

    it('flags an error when the request fails', () => {
      mockBilateralApi.PATCH_contributors.mockReturnValue(throwError(() => new Error('nope')));
      service.setResultId(7);
      service.saveContributors({});
      expect(service.fieldStatus()['contributors']).toBe('error');
    });
  });

  describe('loadTocState', () => {
    const emptyState = {
      planned_result: null,
      toc_level_id: null,
      toc_result_id: null,
      indicator_id: null,
      contributing_indicator: null,
      toc_progressive_narrative: null,
    };

    it('resolves an empty state without a result id', async () => {
      await expect(service.loadTocState()).resolves.toEqual(emptyState);
      expect(mockBilateralApi.GET_tocState).not.toHaveBeenCalled();
    });

    it('maps the response', async () => {
      mockBilateralApi.GET_tocState.mockReturnValue(
        of({
          response: {
            planned_result: true,
            toc_level_id: 2,
            toc_result_id: 55,
            indicator_id: 7,
            contributing_indicator: 3,
            toc_progressive_narrative: 'narrative',
          },
        }) as any
      );
      service.setResultId(5);

      await expect(service.loadTocState()).resolves.toEqual({
        planned_result: true,
        toc_level_id: 2,
        toc_result_id: 55,
        indicator_id: 7,
        contributing_indicator: 3,
        toc_progressive_narrative: 'narrative',
      });
      expect(mockBilateralApi.GET_tocState).toHaveBeenCalledWith(5);
    });

    it('falls back to nulls for an empty response', async () => {
      mockBilateralApi.GET_tocState.mockReturnValue(of({ response: null }) as any);
      service.setResultId(5);
      await expect(service.loadTocState()).resolves.toEqual(emptyState);
    });

    it('falls back to nulls when the request fails', async () => {
      mockBilateralApi.GET_tocState.mockReturnValue(throwError(() => new Error('nope')) as any);
      service.setResultId(5);
      await expect(service.loadTocState()).resolves.toEqual(emptyState);
    });
  });
});
