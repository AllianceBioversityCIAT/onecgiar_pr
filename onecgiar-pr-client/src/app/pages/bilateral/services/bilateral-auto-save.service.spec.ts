import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BilateralAutoSaveService } from './bilateral-auto-save.service';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';
import { ProjectDefault } from '../components/section-toc-default/section-toc-default.component';

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

  describe('loadTocState and saveTocMapping contracts (BIL-TOC-T-5)', () => {
    it('loadTocState round-trips server response containing toc_linkage_mode and project_default', async () => {
      const mockProjectDefault: ProjectDefault = {
        project_id: 194,
        project_name: 'SP06 Bilateral Project',
        nodes: [
          {
            toc_result_id: 123,
            toc_level_id: 2,
            level_name: 'OUTCOME',
            title: 'Default Outcome Node',
            indicators: [
              {
                id: 456,
                description: 'Indicator description',
                type: 'number',
                targets: [{ year: 2026, value: 50 }],
              },
            ],
          },
        ],
      };

      bilateralApi.GET_tocState.mockReturnValue(
        of({
          response: {
            planned_result: true,
            toc_level_id: 2,
            toc_result_id: 123,
            indicator_id: 456,
            contributing_indicator: 789,
            toc_progressive_narrative: 'Narrative text',
            toc_linkage_mode: 'project_default',
            project_default: mockProjectDefault,
          },
        }),
      );

      const state = await service.loadTocState();

      expect(bilateralApi.GET_tocState).toHaveBeenCalledWith(42);
      expect(state).toEqual({
        planned_result: true,
        toc_level_id: 2,
        toc_result_id: 123,
        indicator_id: 456,
        contributing_indicator: 789,
        toc_progressive_narrative: 'Narrative text',
        toc_linkage_mode: 'project_default',
        project_default: mockProjectDefault,
      });
    });

    it('loadTocState with legacy server response missing new fields yields nulls without throwing', async () => {
      bilateralApi.GET_tocState.mockReturnValue(
        of({
          response: {
            planned_result: true,
            toc_level_id: 2,
            toc_result_id: 123,
            indicator_id: 456,
            contributing_indicator: 789,
            toc_progressive_narrative: 'Narrative text',
          },
        }),
      );

      const state = await service.loadTocState();

      expect(state.toc_linkage_mode).toBeNull();
      expect(state.project_default).toBeNull();
      expect(state).toEqual({
        planned_result: true,
        toc_level_id: 2,
        toc_result_id: 123,
        indicator_id: 456,
        contributing_indicator: 789,
        toc_progressive_narrative: 'Narrative text',
        toc_linkage_mode: null,
        project_default: null,
      });
    });

    it('loadTocState returns nulls on API error without throwing', async () => {
      bilateralApi.GET_tocState.mockReturnValue(throwError(() => new Error('API failure')));

      const state = await service.loadTocState();

      expect(state).toEqual({
        planned_result: null,
        toc_level_id: null,
        toc_result_id: null,
        indicator_id: null,
        contributing_indicator: null,
        toc_progressive_narrative: null,
        toc_linkage_mode: null,
        project_default: null,
      });
    });

    it('loadTocState returns nulls when resultId is missing', async () => {
      service.reset();

      const state = await service.loadTocState();

      expect(state).toEqual({
        planned_result: null,
        toc_level_id: null,
        toc_result_id: null,
        indicator_id: null,
        contributing_indicator: null,
        toc_progressive_narrative: null,
        toc_linkage_mode: null,
        project_default: null,
      });
    });

    it('saveTocMapping includes toc_linkage_mode in scheduled payload only when provided', async () => {
      service.saveTocMapping({
        planned_result: true,
        toc_level_id: 2,
        toc_result_id: 123,
        toc_linkage_mode: 'project_default',
      });

      await service.flush(service.getEndpointKeys('contributors'));

      expect(bilateralApi.PATCH_tocMapping).toHaveBeenCalledTimes(1);
      const [, body] = bilateralApi.PATCH_tocMapping.mock.calls[0] as [
        number,
        { result_toc_result: Record<string, unknown> }
      ];
      expect(body.result_toc_result['toc_linkage_mode']).toBe('project_default');
      expect(Object.prototype.hasOwnProperty.call(body.result_toc_result, 'toc_linkage_mode')).toBe(true);
    });

    it('saveTocMapping does not include toc_linkage_mode in scheduled payload when not provided', async () => {
      service.saveTocMapping({
        planned_result: true,
        toc_level_id: 2,
        toc_result_id: 123,
      });

      await service.flush(service.getEndpointKeys('contributors'));

      expect(bilateralApi.PATCH_tocMapping).toHaveBeenCalledTimes(1);
      const [, body] = bilateralApi.PATCH_tocMapping.mock.calls[0] as [
        number,
        { result_toc_result: Record<string, unknown> }
      ];
      expect(Object.prototype.hasOwnProperty.call(body.result_toc_result, 'toc_linkage_mode')).toBe(false);
      expect(body.result_toc_result['toc_linkage_mode']).toBeUndefined();
    });

    it('saveTocMapping includes toc_linkage_mode in unplanned scheduled payload when provided', async () => {
      service.saveTocMapping({
        planned_result: false,
        toc_progressive_narrative: 'Unplanned reason',
        toc_linkage_mode: 'custom',
      });

      await service.flush(service.getEndpointKeys('contributors'));

      expect(bilateralApi.PATCH_tocMapping).toHaveBeenCalledTimes(1);
      const [, body] = bilateralApi.PATCH_tocMapping.mock.calls[0] as [
        number,
        { result_toc_result: Record<string, unknown> }
      ];
      expect(body.result_toc_result['toc_linkage_mode']).toBe('custom');
      expect(Object.prototype.hasOwnProperty.call(body.result_toc_result, 'toc_linkage_mode')).toBe(true);
    });
  });
});
