import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, debounceTime, Subject } from 'rxjs';
import { BilateralApiService } from '../../../shared/services/api/bilateral-api.service';

export type FieldType = 'text' | 'select' | 'checkbox';
export type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';
export type GlobalSaveState = 'idle' | 'saving' | 'saved' | 'error';

type EndpointKey = 'generalInfo' | 'plannedResult' | 'tocMapping' | 'contributors';

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
};

@Injectable({ providedIn: 'root' })
export class BilateralAutoSaveService {
  private readonly bilateralApi = inject(BilateralApiService);

  private readonly _pendingFields = new Map<string, { fieldPath: string; value: unknown; fieldType: FieldType }>();
  private readonly _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly _blurSubject = new Subject<{ fieldPath: string; value: unknown }>();

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

  async flush(): Promise<void> {
    const pending = Array.from(this._pendingFields.entries());
    const resultId = this._currentResultId();
    if (!resultId || pending.length === 0) return;

    this._pendingFields.clear();
    this.hasPendingSaves.set(false);

    const byEndpoint = new Map<EndpointKey, { fields: string[]; body: Record<string, unknown> }>();
    for (const [_key, entry] of pending) {
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
      try {
        this.patchByEndpoint(endpointKey, resultId, batch.body).subscribe({
          next: () => this.markFieldsSavedThenIdle(batch.fields),
          error: () => this.setFieldStatuses(batch.fields, 'error'),
        });
      } catch {
        this.setFieldStatuses(batch.fields, 'error');
      }
    }
  }

  updateFieldsBatch(updates: Record<string, unknown>): void {
    for (const [fieldPath, value] of Object.entries(updates)) {
      this.fieldStatus.update(s => ({ ...s, [fieldPath]: 'saving' }));
      this._pendingFields.set(fieldPath, { fieldPath, value, fieldType: 'select' });
    }
    this.hasPendingSaves.set(true);
    this.flush();
  }

  reset(): void {
    this._pendingFields.clear();
    this._debounceTimers.forEach(t => clearTimeout(t));
    this._debounceTimers.clear();
    this.fieldStatus.set({});
    this.hasPendingSaves.set(false);
    this._currentResultId.set(null);
  }

  private readonly _currentResultId = signal<number | null>(null);
  setResultId(id: number): void {
    this._currentResultId.set(id);
  }

  private flushField(fieldPath: string, value: unknown): void {
    this._pendingFields.set(fieldPath, { fieldPath, value, fieldType: 'text' });
    this.hasPendingSaves.set(true);
    this.flush();
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
    const resultId = this._currentResultId();
    if (!resultId) return;

    const tocLevelId = tocData.toc_level_id ? Number(tocData.toc_level_id) : undefined;
    const tocResultId = tocData.toc_result_id ? Number(tocData.toc_result_id) : undefined;
    const indicatorId = tocData.indicator_id ? String(tocData.indicator_id) : undefined;
    const contributing = tocData.contributing_indicator !== undefined && tocData.contributing_indicator !== null
      ? Number(tocData.contributing_indicator) : undefined;

    const body: Record<string, unknown> = {
      result_toc_result: {
        planned_result: tocData.planned_result ?? true,
        result_toc_results: [{
          toc_level_id: tocLevelId,
          toc_result_id: tocResultId,
          toc_progressive_narrative: tocData.toc_progressive_narrative,
          ...(indicatorId && {
            indicators: [{
              id: indicatorId,
              targets: contributing !== undefined ? [{
                targetId: 0,
                contributing_indicator: contributing,
              }] : [],
            }],
          }),
        }],
      },
    };

    this.fieldStatus.update(s => ({ ...s, toc_mapping: 'saving' }));
    this.bilateralApi.PATCH_tocMapping(resultId, body).subscribe({
      next: () => {
        this.fieldStatus.update(s => ({ ...s, toc_mapping: 'saved' }));
        this.scheduleSavedToIdle('toc_mapping');
      },
      error: () => {
        this.fieldStatus.update(s => ({ ...s, toc_mapping: 'error' }));
      },
    });
  }

  saveContributors(contributorsData: {
    contributing_center?: { institution_id: number }[];
    contributing_bilateral_projects?: { project_id: number; is_lead?: boolean }[];
  }): void {
    const resultId = this._currentResultId();
    if (!resultId) return;

    this.fieldStatus.update(s => ({ ...s, contributors: 'saving' }));
    this.bilateralApi.PATCH_contributors(resultId, contributorsData).subscribe({
      next: () => {
        this.fieldStatus.update(s => ({ ...s, contributors: 'saved' }));
        this.scheduleSavedToIdle('contributors');
      },
      error: () => {
        this.fieldStatus.update(s => ({ ...s, contributors: 'error' }));
      },
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

    return new Promise((resolve) => {
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
