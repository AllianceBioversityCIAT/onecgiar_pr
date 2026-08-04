import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, debounceTime, Subject } from 'rxjs';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';

export type FieldType = 'text' | 'select' | 'checkbox';
export type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';
export type GlobalSaveState = 'idle' | 'saving' | 'saved' | 'error';
export type EndpointKey =
  | 'generalInfo'
  | 'plannedResult'
  | 'tocMapping'
  | 'contributors'
  | 'geography'
  | 'typeSpecific';

export type PayloadExecutor = (resultId: number, body: Record<string, unknown>) => Observable<unknown>;

const FIELD_ENDPOINT_KEYS: Record<string, EndpointKey> = {
  title: 'generalInfo',
  description: 'generalInfo',
  lead_contact_person: 'generalInfo',
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
  private readonly _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly _payloadDebounceTimers = new Map<EndpointKey, ReturnType<typeof setTimeout>>();
  private readonly _pendingPayloads = new Map<EndpointKey, Record<string, unknown>>();
  private readonly _payloadStatusKeys = new Map<EndpointKey, string[]>();
  private readonly _payloadExecutors = new Map<EndpointKey, PayloadExecutor>();
  private readonly _inFlight = new Map<EndpointKey, boolean>();
  private readonly _queuedPayloads = new Map<
    EndpointKey,
    { body: Record<string, unknown>; statusKeys: string[]; executor?: PayloadExecutor }
  >();
  private readonly _blurSubject = new Subject<{ fieldPath: string; value: unknown }>();
  private _generation = 0;

  readonly manualSave$ = new Subject<void>();

  fieldStatus = signal<Record<string, FieldStatus>>({});
  hasPendingSaves = signal(false);

  globalSaveState = computed<GlobalSaveState>(() => {
    const statuses = Object.values(this.fieldStatus());
    if (statuses.includes('saving')) return 'saving';
    if (statuses.includes('error')) return 'error';
    if (statuses.length > 0 && statuses.every(s => s === 'idle' || s === 'saved')) return 'saved';
    return 'idle';
  });

  constructor() {
    this._blurSubject.pipe(debounceTime(50)).subscribe(({ fieldPath, value }) => {
      this.flushField(fieldPath, value);
    });
  }

  registerField(fieldPath: string, fieldType: FieldType): void {
    this.fieldStatus.update(s => ({ ...s, [fieldPath]: 'idle' }));
  }

  updateField(fieldPath: string, value: unknown, fieldType: FieldType = 'text'): void {
    this.fieldStatus.update(s => ({ ...s, [fieldPath]: 'saving' }));

    if (fieldType === 'text') {
      const existing = this._debounceTimers.get(fieldPath);
      if (existing) clearTimeout(existing);
      this._debounceTimers.set(
        fieldPath,
        setTimeout(() => this.flushField(fieldPath, value), 800)
      );
    } else {
      this.flushField(fieldPath, value);
    }
  }

  notifyBlur(fieldPath: string, value: unknown): void {
    const existing = this._debounceTimers.get(fieldPath);
    if (existing) clearTimeout(existing);
    this._blurSubject.next({ fieldPath, value });
  }

  /**
   * Schedule a structured payload save (geo, toc, contributors, type-specific) with optional debounce.
   * Coalesces while in-flight: only the latest body is sent after the current request finishes.
   * Optional `executor` overrides the default BilateralApiService PATCH for that endpoint.
   */
  schedulePayload(
    endpointKey: EndpointKey,
    body: Record<string, unknown>,
    options?: { debounceMs?: number; statusKey?: string | string[]; executor?: PayloadExecutor }
  ): void {
    const statusKeys = this.normalizeStatusKeys(endpointKey, options?.statusKey);
    const debounceMs = options?.debounceMs ?? 0;

    this.setFieldStatuses(statusKeys, 'saving');
    this._pendingPayloads.set(endpointKey, body);
    this._payloadStatusKeys.set(endpointKey, statusKeys);
    if (options?.executor) {
      this._payloadExecutors.set(endpointKey, options.executor);
    }
    this.hasPendingSaves.set(true);

    const existing = this._payloadDebounceTimers.get(endpointKey);
    if (existing) clearTimeout(existing);

    if (debounceMs > 0) {
      this._payloadDebounceTimers.set(
        endpointKey,
        setTimeout(() => this.dispatchPendingPayload(endpointKey), debounceMs)
      );
    } else {
      this.dispatchPendingPayload(endpointKey);
    }
  }

  /**
   * Run an arbitrary request immediately while tracking field status (evidence / type-specific).
   */
  runImmediate(statusKey: string, requestFn: () => Observable<unknown>): void {
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

  async flush(): Promise<void> {
    this._debounceTimers.forEach(t => clearTimeout(t));
    this._debounceTimers.clear();
    this._payloadDebounceTimers.forEach(t => clearTimeout(t));
    this._payloadDebounceTimers.clear();

    const resultId = this._currentResultId();
    if (!resultId) return;

    const pendingFields = Array.from(this._pendingFields.entries());
    this._pendingFields.clear();

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
      this.dispatchPendingPayload(endpointKey);
    }

    this.refreshPendingFlag();
  }

  updateFieldsBatch(updates: Record<string, unknown>): void {
    for (const [fieldPath, value] of Object.entries(updates)) {
      this.fieldStatus.update(s => ({ ...s, [fieldPath]: 'saving' }));
      this._pendingFields.set(fieldPath, { fieldPath, value, fieldType: 'select' });
    }
    this.hasPendingSaves.set(true);
    void this.flush();
  }

  reset(): void {
    this._generation += 1;
    this._pendingFields.clear();
    this._debounceTimers.forEach(t => clearTimeout(t));
    this._debounceTimers.clear();
    this._payloadDebounceTimers.forEach(t => clearTimeout(t));
    this._payloadDebounceTimers.clear();
    this._pendingPayloads.clear();
    this._payloadStatusKeys.clear();
    this._payloadExecutors.clear();
    this._queuedPayloads.clear();
    this._inFlight.clear();
    this.fieldStatus.set({});
    this.hasPendingSaves.set(false);
    this._currentResultId.set(null);
  }

  private readonly _currentResultId = signal<number | null>(null);
  setResultId(id: number): void {
    this._generation += 1;
    this._currentResultId.set(id);
  }

  private flushField(fieldPath: string, value: unknown): void {
    this._pendingFields.set(fieldPath, { fieldPath, value, fieldType: 'text' });
    this.hasPendingSaves.set(true);
    void this.flush();
  }

  private normalizeStatusKeys(endpointKey: EndpointKey, statusKey?: string | string[]): string[] {
    if (Array.isArray(statusKey) && statusKey.length) return statusKey;
    if (typeof statusKey === 'string' && statusKey) return [statusKey];
    return [ENDPOINT_STATUS_KEY[endpointKey]];
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
      this._queuedPayloads.set(endpointKey, { body, statusKeys, executor });
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

    const request$ = executor
      ? executor(resultId, body)
      : this.patchByEndpoint(endpointKey, resultId, body);

    try {
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

    const body: Record<string, unknown> = {
      result_toc_result: {
        planned_result: tocData.planned_result ?? true,
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
