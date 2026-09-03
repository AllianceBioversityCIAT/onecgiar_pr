import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';

export type FieldType = 'text' | 'select' | 'checkbox';
export type FieldStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
export type GlobalSaveState = 'idle' | 'saving' | 'saved' | 'error';
export type EndpointKey =
  | 'generalInfo'
  | 'plannedResult'
  | 'tocMapping'
  | 'contributors'
  | 'geography'
  | 'typeSpecific';

export type PayloadExecutor = (resultId: number, body: Record<string, unknown>) => Observable<unknown>;

/**
 * Editor-owned save boundaries. These deliberately describe the existing HTTP contract rather than
 * inventing a new API: each group is flushed only by the Bilateral editor's explicit Save draft action.
 */
export type BilateralEditorSection =
  | 'section-zero'
  | 'general-info'
  | 'contributors'
  | 'geography'
  | 'evidence'
  | 'type-specific';

const SECTION_ENDPOINT_KEYS: Record<BilateralEditorSection, EndpointKey[]> = {
  'section-zero': ['contributors'],
  'general-info': ['generalInfo'],
  contributors: ['plannedResult', 'tocMapping', 'contributors'],
  geography: ['geography'],
  evidence: [],
  'type-specific': ['typeSpecific'],
};

const FIELD_ENDPOINT_KEYS: Record<string, EndpointKey> = {
  title: 'generalInfo',
  description: 'generalInfo',
  lead_contact_person: 'generalInfo',
  lead_contact_person_data: 'generalInfo',
  gender_tag_level_id: 'generalInfo',
  climate_change_tag_level_id: 'generalInfo',
  nutrition_tag_level_id: 'generalInfo',
  environmental_biodiversity_tag_level_id: 'generalInfo',
  poverty_tag_level_id: 'generalInfo',
  gender_impact_area_ids: 'generalInfo',
  climate_impact_area_ids: 'generalInfo',
  nutrition_impact_area_ids: 'generalInfo',
  environmental_biodiversity_impact_area_ids: 'generalInfo',
  poverty_impact_area_ids: 'generalInfo',
  planned_result: 'plannedResult',
  programCode: 'plannedResult',
  toc_mapping: 'tocMapping',
  contributors: 'contributors',
  geography: 'geography',
  'type-specific': 'typeSpecific',
};

const ENDPOINT_STATUS_KEY: Record<EndpointKey, string> = {
  generalInfo: 'generalInfo',
  plannedResult: 'plannedResult',
  tocMapping: 'toc_mapping',
  contributors: 'contributors',
  geography: 'geography',
  typeSpecific: 'type-specific',
};

@Injectable()
export class BilateralAutoSaveService {
  private readonly bilateralApi = inject(BilateralApiService);

  private readonly _pendingFields = new Map<string, { fieldPath: string; value: unknown; fieldType: FieldType }>();
  private readonly _pendingPayloads = new Map<EndpointKey, Record<string, unknown>>();
  private readonly _payloadStatusKeys = new Map<EndpointKey, string[]>();
  private readonly _payloadExecutors = new Map<EndpointKey, PayloadExecutor>();
  private readonly _inFlight = new Map<EndpointKey, boolean>();
  private readonly _queuedPayloads = new Map<
    EndpointKey,
    { body: Record<string, unknown>; statusKeys: string[]; executor?: PayloadExecutor }
  >();
  private _generation = 0;
  /**
   * True only once a request has actually come back OK. `registerField` seeds every field as
   * `idle`, so without this the chip read "All changes saved" on a freshly opened result before
   * anything had been typed, let alone saved.
   */
  private readonly _hasSavedOnce = signal(false);

  /** Evidence has its own multipart persistence; it listens only when its section is explicitly saved. */
  readonly manualSave$ = new Subject<BilateralEditorSection>();

  fieldStatus = signal<Record<string, FieldStatus>>({});
  hasPendingSaves = signal(false);

  /**
   * P2-3520 — the real lock. Disabling the inputs is the visible half; this is the half that keeps
   * edits out of the database once the result has left the centre's hands.
   *
   * Every public write entry point checks it and returns early, so a control that somehow stays
   * interactive (a stale template, a keyboard path, a section that saves from an effect) still cannot
   * persist. It guards `flush()` too, which is what runs when the page is left.
   *
   * Set from the editor out of `BilateralCreationService.isEditableByCenterUser()`; defaults to false
   * so the wizard and any consumer that never sets it keep saving as before.
   */
  readonly isReadOnly = signal(false);

  setReadOnly(readOnly: boolean): void {
    this.isReadOnly.set(readOnly);
  }

  globalSaveState = computed<GlobalSaveState>(() => {
    const statuses = Object.values(this.fieldStatus());
    if (statuses.includes('saving')) return 'saving';
    if (statuses.includes('error')) return 'error';
    if (this._hasSavedOnce() && statuses.length > 0 && statuses.every(s => s === 'idle' || s === 'saved'))
      return 'saved';
    return 'idle';
  });

  registerField(fieldPath: string, fieldType: FieldType): void {
    this.fieldStatus.update(s => ({ ...s, [fieldPath]: 'idle' }));
  }

  updateField(fieldPath: string, value: unknown, fieldType: FieldType = 'text'): void {
    if (this.isReadOnly()) return;
    this.stageField(fieldPath, value, fieldType);
  }

  notifyBlur(fieldPath: string, value: unknown): void {
    if (this.isReadOnly()) return;
    this.stageField(fieldPath, value, 'text');
  }

  /**
   * Stages a structured payload (geo, ToC, contributors, type-specific). Despite its historic
   * method name, this method never makes an HTTP request: explicit section Save draft owns that.
   * `debounceMs` remains accepted to preserve all existing section call sites and payload contracts.
   */
  schedulePayload(
    endpointKey: EndpointKey,
    body: Record<string, unknown>,
    options?: { debounceMs?: number; statusKey?: string | string[]; executor?: PayloadExecutor }
  ): void {
    if (this.isReadOnly()) return;

    const statusKeys = this.normalizeStatusKeys(endpointKey, options?.statusKey);
    this.setFieldStatuses(statusKeys, 'dirty');
    this._pendingPayloads.set(endpointKey, body);
    this._payloadStatusKeys.set(endpointKey, statusKeys);
    if (options?.executor) {
      this._payloadExecutors.set(endpointKey, options.executor);
    }
    this.hasPendingSaves.set(true);

  }

  /**
   * Run an arbitrary request immediately while tracking field status (evidence / type-specific).
   */
  runImmediate(statusKey: string, requestFn: () => Observable<unknown>): void {
    if (this.isReadOnly()) return;

    const generation = this._generation;
    this.fieldStatus.update(s => ({ ...s, [statusKey]: 'saving' }));
    requestFn().subscribe({
      next: () => {
        if (generation !== this._generation) return;
        this.markFieldsSavedThenIdle([statusKey]);
        this.refreshPendingFlag();
      },
      error: () => {
        if (generation !== this._generation) return;
        this.setFieldStatuses([statusKey], 'error');
        this.refreshPendingFlag();
      },
    });
  }

  async flush(endpointKeys?: readonly EndpointKey[]): Promise<void> {
    if (this.isReadOnly()) return;

    const resultId = this._currentResultId();
    if (!resultId) return;

    const selected = endpointKeys ? new Set(endpointKeys) : null;
    const pendingFields = Array.from(this._pendingFields.entries()).filter(([, entry]) => {
      const endpoint = FIELD_ENDPOINT_KEYS[entry.fieldPath];
      return !!endpoint && (!selected || selected.has(endpoint));
    });
    for (const [key] of pendingFields) this._pendingFields.delete(key);

    const byEndpoint = new Map<EndpointKey, { fields: string[]; body: Record<string, unknown> }>();
    for (const [_key, entry] of pendingFields) {
      const endpointKey = FIELD_ENDPOINT_KEYS[entry.fieldPath];
      if (!endpointKey) continue;
      let batch = byEndpoint.get(endpointKey);
      if (!batch) {
        batch = { fields: [], body: {} };
        byEndpoint.set(endpointKey, batch);
      }
      batch.fields.push(entry.fieldPath);
      batch.body[entry.fieldPath] = entry.value;
    }

    for (const [endpointKey, batch] of byEndpoint) {
      this.enqueueEndpointRequest(endpointKey, batch.body, batch.fields);
    }

    for (const endpointKey of Array.from(this._pendingPayloads.keys())) {
      if (selected && !selected.has(endpointKey)) continue;
      this.dispatchPendingPayload(endpointKey);
    }

    this.refreshPendingFlag();
  }

  updateFieldsBatch(updates: Record<string, unknown>): void {
    if (this.isReadOnly()) return;

    for (const [fieldPath, value] of Object.entries(updates)) {
      this.fieldStatus.update(s => ({ ...s, [fieldPath]: 'dirty' }));
      this._pendingFields.set(fieldPath, { fieldPath, value, fieldType: 'select' });
    }
    this.hasPendingSaves.set(true);
  }

  getEndpointKeys(section: BilateralEditorSection): readonly EndpointKey[] {
    return SECTION_ENDPOINT_KEYS[section];
  }

  hasPendingFor(section: BilateralEditorSection): boolean {
    const keys = new Set(this.getEndpointKeys(section));
    if (section === 'evidence') {
      const status = this.fieldStatus()['evidence'];
      return status === 'dirty' || status === 'saving' || status === 'error';
    }
    return (
      Array.from(this._pendingFields.values()).some(field => keys.has(FIELD_ENDPOINT_KEYS[field.fieldPath])) ||
      Array.from(this._pendingPayloads.keys()).some(key => keys.has(key)) ||
      Array.from(this._queuedPayloads.keys()).some(key => keys.has(key)) ||
      Array.from(this._inFlight.entries()).some(([key, active]) => active && keys.has(key)) ||
      Object.entries(this.fieldStatus()).some(([field, status]) => {
        const endpoint = FIELD_ENDPOINT_KEYS[field] ?? this.endpointForStatusKey(field);
        return !!endpoint && (status === 'dirty' || status === 'saving' || status === 'error') && keys.has(endpoint);
      })
    );
  }

  hasErrorFor(section: BilateralEditorSection): boolean {
    const keys = new Set(this.getEndpointKeys(section));
    return Object.entries(this.fieldStatus()).some(([field, status]) => {
      const endpoint = FIELD_ENDPOINT_KEYS[field] ?? this.endpointForStatusKey(field);
      return status === 'error' && (section === 'evidence' ? field === 'evidence' : !!endpoint && keys.has(endpoint));
    });
  }

  markDirty(statusKey: string): void {
    if (this.isReadOnly()) return;
    this.setFieldStatuses([statusKey], 'dirty');
    this.hasPendingSaves.set(true);
  }

  reset(): void {
    this._generation += 1;
    this._pendingFields.clear();
    this._pendingPayloads.clear();
    this._payloadStatusKeys.clear();
    this._payloadExecutors.clear();
    this._queuedPayloads.clear();
    this._inFlight.clear();
    this.fieldStatus.set({});
    this.hasPendingSaves.set(false);
    this._hasSavedOnce.set(false);
    this._currentResultId.set(null);
    // reset() also runs between results in the same visit: a locked result must not leave the next
    // one locked.
    this.isReadOnly.set(false);
  }

  private readonly _currentResultId = signal<number | null>(null);
  setResultId(id: number): void {
    this._generation += 1;
    this._currentResultId.set(id);
  }

  private stageField(fieldPath: string, value: unknown, fieldType: FieldType): void {
    this.fieldStatus.update(s => ({ ...s, [fieldPath]: 'dirty' }));
    this._pendingFields.set(fieldPath, { fieldPath, value, fieldType });
    this.hasPendingSaves.set(true);
  }

  private normalizeStatusKeys(endpointKey: EndpointKey, statusKey?: string | string[]): string[] {
    if (Array.isArray(statusKey) && statusKey.length) return statusKey;
    if (typeof statusKey === 'string' && statusKey) return [statusKey];
    return [ENDPOINT_STATUS_KEY[endpointKey]];
  }

  private endpointForStatusKey(statusKey: string): EndpointKey | undefined {
    return (Object.keys(ENDPOINT_STATUS_KEY) as EndpointKey[]).find(key => ENDPOINT_STATUS_KEY[key] === statusKey);
  }

  private dispatchPendingPayload(endpointKey: EndpointKey): void {
    const body = this._pendingPayloads.get(endpointKey);
    if (!body) return;
    const statusKeys = this._payloadStatusKeys.get(endpointKey) ?? [ENDPOINT_STATUS_KEY[endpointKey]];
    const executor = this._payloadExecutors.get(endpointKey);
    this._pendingPayloads.delete(endpointKey);
    this._payloadStatusKeys.delete(endpointKey);
    this.enqueueEndpointRequest(endpointKey, body, statusKeys, executor);
  }

  private enqueueEndpointRequest(
    endpointKey: EndpointKey,
    body: Record<string, unknown>,
    statusKeys: string[],
    executor?: PayloadExecutor
  ): void {
    if (this._inFlight.get(endpointKey)) {
      // ⚠️ MERGE, never replace. `flush()` empties `_pendingFields` as it builds each body, so once a
      // field's value is in here it exists nowhere else. Two edits landing on the same endpoint while
      // a request is in flight (score two Impact Areas in a row, or type the description and
      // immediately touch another field) used to overwrite the first queued body with the second and
      // the first edit was silently dropped. Later keys win per field, so the newest value of any
      // given field is still the one that goes out.
      const queued = this._queuedPayloads.get(endpointKey);
      this._queuedPayloads.set(endpointKey, {
        body: queued ? { ...queued.body, ...body } : body,
        statusKeys: queued ? Array.from(new Set([...queued.statusKeys, ...statusKeys])) : statusKeys,
        executor: executor ?? queued?.executor,
      });
      this.setFieldStatuses(statusKeys, 'saving');
      this.hasPendingSaves.set(true);
      return;
    }
    this.sendEndpointRequest(endpointKey, body, statusKeys, executor);
  }

  private sendEndpointRequest(
    endpointKey: EndpointKey,
    body: Record<string, unknown>,
    statusKeys: string[],
    executor?: PayloadExecutor
  ): void {
    const resultId = this._currentResultId();
    if (!resultId) {
      this.setFieldStatuses(statusKeys, 'error');
      this.refreshPendingFlag();
      return;
    }

    const generation = this._generation;
    this._inFlight.set(endpointKey, true);
    this.setFieldStatuses(statusKeys, 'saving');

    try {
      const request$ = executor
        ? executor(resultId, body)
        : this.patchByEndpoint(endpointKey, resultId, body);

      request$.subscribe({
        next: () => {
          if (generation !== this._generation) {
            this._inFlight.set(endpointKey, false);
            return;
          }
          this._inFlight.set(endpointKey, false);
          this.markFieldsSavedThenIdle(statusKeys);
          this.drainQueuedPayload(endpointKey);
          this.refreshPendingFlag();
        },
        error: () => {
          if (generation !== this._generation) {
            this._inFlight.set(endpointKey, false);
            return;
          }
          this._inFlight.set(endpointKey, false);
          this.setFieldStatuses(statusKeys, 'error');
          this.drainQueuedPayload(endpointKey);
          this.refreshPendingFlag();
        },
      });
    } catch {
      this._inFlight.set(endpointKey, false);
      this.setFieldStatuses(statusKeys, 'error');
      this.refreshPendingFlag();
    }
  }

  private drainQueuedPayload(endpointKey: EndpointKey): void {
    const queued = this._queuedPayloads.get(endpointKey);
    if (!queued) return;
    this._queuedPayloads.delete(endpointKey);
    this.sendEndpointRequest(endpointKey, queued.body, queued.statusKeys, queued.executor);
  }

  private refreshPendingFlag(): void {
    const pending =
      this._pendingFields.size > 0 ||
      this._pendingPayloads.size > 0 ||
      this._queuedPayloads.size > 0 ||
      Array.from(this._inFlight.values()).some(Boolean);
    this.hasPendingSaves.set(pending);
  }

  private setFieldStatuses(fields: string[], status: FieldStatus): void {
    for (const field of fields) {
      this.fieldStatus.update(s => ({ ...s, [field]: status }));
    }
  }

  private markFieldsSavedThenIdle(fields: string[]): void {
    this._hasSavedOnce.set(true);
    this.setFieldStatuses(fields, 'saved');
    for (const field of fields) {
      this.scheduleSavedToIdle(field);
    }
  }

  private scheduleSavedToIdle(field: string): void {
    setTimeout(() => this.revertSavedToIdle(field), 2000);
  }

  private revertSavedToIdle(field: string): void {
    this.fieldStatus.update(s => {
      const next = { ...s };
      if (next[field] === 'saved') next[field] = 'idle';
      return next;
    });
  }

  private patchByEndpoint(endpointKey: EndpointKey, resultId: number, body: Record<string, unknown>): Observable<any> {
    switch (endpointKey) {
      case 'generalInfo':
        return this.bilateralApi.PATCH_generalInfo(resultId, body);
      case 'plannedResult':
        return this.bilateralApi.PATCH_plannedResult(resultId, body);
      case 'tocMapping':
        return this.bilateralApi.PATCH_tocMapping(resultId, body);
      case 'contributors':
        return this.bilateralApi.PATCH_contributors(resultId, body);
      case 'geography':
        return this.bilateralApi.PATCH_geographic(resultId, body);
      case 'typeSpecific':
        throw new Error('typeSpecific requires an executor');
    }
  }

  saveTocMapping(tocData: {
    planned_result?: boolean;
    toc_level_id?: number | string;
    toc_result_id?: number | string;
    toc_progressive_narrative?: string;
    indicator_id?: number | string;
    contributing_indicator?: number | string;
  }): void {
    const tocLevelId = tocData.toc_level_id ? Number(tocData.toc_level_id) : undefined;
    const tocResultId = tocData.toc_result_id ? Number(tocData.toc_result_id) : undefined;
    const indicatorId = tocData.indicator_id ? String(tocData.indicator_id) : undefined;
    const contributing =
      tocData.contributing_indicator !== undefined && tocData.contributing_indicator !== null
        ? Number(tocData.contributing_indicator)
        : undefined;

    const plannedResult = tocData.planned_result ?? true;

    // Unplanned results have no ToC node to hang the justification on. The server reads it from
    // the top level of `result_toc_result` (`_handleUnplannedSpecialCase` in
    // results-toc-results.service.ts) and skips any `result_toc_results` entry that carries no
    // `toc_result_id`, so sending the array here would silently discard the text.
    if (plannedResult === false && !tocResultId) {
      this.schedulePayload(
        'tocMapping',
        {
          result_toc_result: {
            planned_result: false,
            toc_progressive_narrative: tocData.toc_progressive_narrative ?? null,
          },
        },
        { debounceMs: 0, statusKey: 'toc_mapping' },
      );
      return;
    }

    const body: Record<string, unknown> = {
      result_toc_result: {
        planned_result: plannedResult,
        result_toc_results: [
          {
            toc_level_id: tocLevelId,
            toc_result_id: tocResultId,
            toc_progressive_narrative: tocData.toc_progressive_narrative,
            ...(indicatorId && {
              indicators: [
                {
                  id: indicatorId,
                  targets:
                    contributing !== undefined
                      ? [
                          {
                            targetId: 0,
                            contributing_indicator: contributing,
                          },
                        ]
                      : [],
                },
              ],
            }),
          },
        ],
      },
    };

    this.schedulePayload('tocMapping', body, { debounceMs: 0, statusKey: 'toc_mapping' });
  }

  saveContributors(contributorsData: {
    contributing_center?: { institution_id: number }[];
    contributing_bilateral_projects?: { project_id: number; is_lead?: boolean }[];
    contributing_programs?: { science_program_id: string }[];
    institutions?: { institutions_id: number }[];
    no_external_partners?: boolean;
    is_lead_by_partner?: boolean;
  }): void {
    this.schedulePayload('contributors', contributorsData as Record<string, unknown>, {
      debounceMs: 0,
      statusKey: 'contributors',
    });
  }

  loadTocState(): Promise<{
    planned_result: boolean | null;
    toc_level_id: number | null;
    toc_result_id: number | null;
    indicator_id: number | null;
    contributing_indicator: number | null;
    toc_progressive_narrative: string | null;
  }> {
    const resultId = this._currentResultId();
    if (!resultId) {
      return Promise.resolve({
        planned_result: null,
        toc_level_id: null,
        toc_result_id: null,
        indicator_id: null,
        contributing_indicator: null,
        toc_progressive_narrative: null,
      });
    }

    return new Promise(resolve => {
      this.bilateralApi.GET_tocState(resultId).subscribe({
        next: ({ response }) => {
          resolve({
            planned_result: response?.planned_result ?? null,
            toc_level_id: response?.toc_level_id ?? null,
            toc_result_id: response?.toc_result_id ?? null,
            indicator_id: response?.indicator_id ?? null,
            contributing_indicator: response?.contributing_indicator ?? null,
            toc_progressive_narrative: response?.toc_progressive_narrative ?? null,
          });
        },
        error: () => {
          resolve({
            planned_result: null,
            toc_level_id: null,
            toc_result_id: null,
            indicator_id: null,
            contributing_indicator: null,
            toc_progressive_narrative: null,
          });
        },
      });
    });
  }
}
