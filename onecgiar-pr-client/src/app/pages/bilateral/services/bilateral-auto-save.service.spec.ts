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

  describe('BSF-T-2: scoped failure determination (stale vs current errors)', () => {
    // Field A fails and settles (flush() always drains `_pendingFields` on dispatch, success or
    // failure, so A has no pending data left and its `'error'` status persists with nothing to
    // retry it). Field B is then staged and flushed independently, and ITS PATCH succeeds.
    //
    // RED (pre-fix, walked against the code as it stood before this task — a setup-absence red:
    // `pendingStatusKeysFor`/`hasErrorForFields` did not exist yet, so this exact test could not be
    // run against that code at all): the OLD, still-current `hasErrorFor('general-info')` — the
    // exact call `triggerManualSave()` made before this fix — still sees A's stale `'error'` and
    // misreports B's successful flush as failed
    // (`expect(service.hasErrorFor('general-info')).toBe(false)` failed with `Received: true`).
    // That divergence is reproduced below as `hasErrorFor(...)` still reading `true` — unchanged,
    // on purpose (design.md §2.3 / `BSF-DD-2`: other call sites still rely on the section-wide
    // version, so it is not touched) — while the new, scoped check `hasErrorForFields` correctly
    // reads `false` for exactly what B's flush covered. This is the BSF-AC-2 falsifier.
    it('BSF-AC-2 falsifier: a stale, unrelated field error must not fail a later, independent, successful flush', async () => {
      bilateralApi.PATCH_generalInfo.mockReturnValueOnce(throwError(() => new Error('network')));
      service.updateField('title', 'Field A value');
      await service.flush(service.getEndpointKeys('general-info'));
      expect(service.fieldStatus()['title']).toBe('error');

      // Captured BEFORE flush(), same timing discipline `triggerManualSave()` uses — this is what
      // scopes the failure check to exactly what THIS flush covers.
      service.updateField('description', 'Field B value');
      const flushTargets = service.pendingStatusKeysFor('general-info');
      bilateralApi.PATCH_generalInfo.mockReturnValueOnce(of({}));
      await service.flush(service.getEndpointKeys('general-info'));

      expect(flushTargets).toEqual(['description']);
      // The OLD section-wide check still reads true — A's stale error, unchanged by design.
      expect(service.hasErrorFor('general-info')).toBe(true);
      // The NEW scoped check correctly reads false: B's own flush never failed.
      expect(service.hasErrorForFields(flushTargets)).toBe(false);
    });

    // Disqualifier guard (BSF-R-3 / BSF-AC-3): the scoping must not also swallow a GENUINE
    // current-flush failure. Field C fails as part of the flush the scoped check is evaluating —
    // it must still be caught, with the server's own reason surfaced.
    it('disqualifier guard: a genuine CURRENT-flush failure is still caught by the scoped check', async () => {
      bilateralApi.PATCH_generalInfo.mockReturnValueOnce(throwError(() => ({ error: { message: 'Title cannot be empty.' } })));
      service.updateField('title', '');
      const flushTargets = service.pendingStatusKeysFor('general-info');

      await service.flush(service.getEndpointKeys('general-info'));

      expect(flushTargets).toEqual(['title']);
      expect(service.hasErrorForFields(flushTargets)).toBe(true);
      expect(service.lastErrorMessageForFields(flushTargets)).toBe('Title cannot be empty.');
    });
  });

  describe('BSF-T-2 rework (Reviewer FAIL, attempt 2): the Evidence gap in pendingStatusKeysFor', () => {
    // Evidence never goes through `_pendingFields`/`_pendingPayloads` — `SECTION_ENDPOINT_KEYS.evidence`
    // is `[]` and its Save draft runs through `runImmediate('evidence', …)` instead
    // (section-evidence.component.ts:191-195, 463: `manualSave$` → `saveSection()` → `runImmediate`).
    // Attempt 1's `pendingStatusKeysFor('evidence')` only read `_pendingFields`/`_pendingPayloads`, so
    // it always returned `[]` for Evidence, and `hasErrorForFields([])` is always `false` — a genuine
    // Evidence failure was silently reported as success after the full 15s `waitForSectionSave`
    // timeout. This mirrors the evidence special-case already present in `hasErrorFor` (`:324`) and
    // `hasPendingFor` (`:304-307`).
    it("pendingStatusKeysFor('evidence') captures the evidence status key", () => {
      expect(service.pendingStatusKeysFor('evidence')).toEqual(['evidence']);
    });

    it('a genuine Evidence save failure (via runImmediate) is caught by the scoped check, and the message lookup falls back to null cleanly', () => {
      service.runImmediate('evidence', () => throwError(() => new Error('SharePoint upload failed')));

      expect(service.fieldStatus()['evidence']).toBe('error');
      const flushTargets = service.pendingStatusKeysFor('evidence');
      expect(flushTargets).toEqual(['evidence']);
      expect(service.hasErrorForFields(flushTargets)).toBe(true);
      // No EndpointKey maps to the bare 'evidence' status key, so the scoped message lookup has
      // nothing to resolve to — it must fall back to null (triggerManualSave()'s own fallback then
      // supplies the generic "Please try again" copy), never throw or return another section's reason.
      expect(service.lastErrorMessageForFields(flushTargets)).toBeNull();
    });

    it('a successful Evidence save is NOT reported as failed', () => {
      service.runImmediate('evidence', () => of({}));

      expect(service.fieldStatus()['evidence']).toBe('saved');
      const flushTargets = service.pendingStatusKeysFor('evidence');
      expect(flushTargets).toEqual(['evidence']);
      expect(service.hasErrorForFields(flushTargets)).toBe(false);
    });
  });

  it('does not permit writes after the form becomes read-only', async () => {
    service.setReadOnly(true);
    service.updateField('title', 'Blocked');
    await service.flush(service.getEndpointKeys('general-info'));

    expect(bilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
  });

  describe('setReadOnlyExemptions (BIL-RAU-T-7)', () => {
    it('lets an exempt key through updateField while read-only, and still drops a non-exempt key', async () => {
      service.setReadOnly(true);
      service.setReadOnlyExemptions(['is_discontinued']);

      service.updateField('title', 'Blocked');
      service.updateField('is_discontinued', false);
      await service.flush(service.getEndpointKeys('general-info'));

      expect(bilateralApi.PATCH_generalInfo).toHaveBeenCalledTimes(1);
      expect(bilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(42, { is_discontinued: false });
    });

    it('lets an exempt key through updateFieldsBatch while read-only, dropping the rest of the batch', async () => {
      service.setReadOnly(true);
      service.setReadOnlyExemptions(['is_discontinued', 'discontinued_options', 'merge_split_targets']);

      service.updateFieldsBatch({
        title: 'Blocked',
        is_discontinued: true,
        discontinued_options: [{ investment_discontinued_option_id: 1, is_active: true }],
      });
      await service.flush(service.getEndpointKeys('general-info'));

      expect(bilateralApi.PATCH_generalInfo).toHaveBeenCalledTimes(1);
      expect(bilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(42, {
        is_discontinued: true,
        discontinued_options: [{ investment_discontinued_option_id: 1, is_active: true }],
      });
    });

    it('with no exemption set, read-only drops both an exempt-shaped key and a regular one (today\'s behavior)', async () => {
      service.setReadOnly(true);

      service.updateField('title', 'Blocked');
      service.updateField('is_discontinued', false);
      await service.flush(service.getEndpointKeys('general-info'));

      expect(bilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
    });

    it('exemptions have no effect while the form is editable — everything saves as before', async () => {
      service.setReadOnlyExemptions(['is_discontinued']);
      service.updateField('title', 'Normal edit');
      await service.flush(service.getEndpointKeys('general-info'));

      expect(bilateralApi.PATCH_generalInfo).toHaveBeenCalledWith(42, { title: 'Normal edit' });
    });

    it('clearing exemptions (empty array) restores the full read-only drop', async () => {
      service.setReadOnly(true);
      service.setReadOnlyExemptions(['is_discontinued']);
      service.setReadOnlyExemptions([]);

      service.updateField('is_discontinued', false);
      await service.flush(service.getEndpointKeys('general-info'));

      expect(bilateralApi.PATCH_generalInfo).not.toHaveBeenCalled();
    });
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
