import { Injectable, signal, computed, inject } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export type FieldType = 'text' | 'select' | 'checkbox';
export type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';
export type GlobalSaveState = 'idle' | 'saving' | 'saved' | 'error';

const FIELD_ENDPOINTS: Record<string, string> = {
  title: 'bilateral/general-info/{id}',
  description: 'bilateral/general-info/{id}',
  lead_contact_person: 'bilateral/general-info/{id}',
  gender_tag_level_id: 'bilateral/general-info/{id}',
  climate_change_tag_level_id: 'bilateral/general-info/{id}',
  nutrition_tag_level_id: 'bilateral/general-info/{id}',
  environmental_biodiversity_tag_level_id: 'bilateral/general-info/{id}',
  poverty_tag_level_id: 'bilateral/general-info/{id}',
  gender_impact_area_ids: 'bilateral/general-info/{id}',
  climate_impact_area_ids: 'bilateral/general-info/{id}',
  nutrition_impact_area_ids: 'bilateral/general-info/{id}',
  environmental_biodiversity_impact_area_ids: 'bilateral/general-info/{id}',
  poverty_impact_area_ids: 'bilateral/general-info/{id}',
  planned_result: '../bilateral/center/planned-result/{id}',
  programCode: '../bilateral/center/planned-result/{id}',
  toc_mapping: '../bilateral/center/toc-mapping/{id}',
  contributors: '../bilateral/center/contributors/{id}',
};

@Injectable({ providedIn: 'root' })
export class BilateralAutoSaveService {
  private readonly http = inject(HttpClient);

  private _pendingFields = new Map<string, { fieldPath: string; value: unknown; fieldType: FieldType }>();
  private _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _blurSubject = new Subject<{ fieldPath: string; value: unknown }>();

  fieldStatus = signal<Record<string, FieldStatus>>({});
  hasPendingSaves = signal(false);

  globalSaveState = computed<GlobalSaveState>(() => {
    const statuses = Object.values(this.fieldStatus());
    if (statuses.some(s => s === 'saving')) return 'saving';
    if (statuses.some(s => s === 'error')) return 'error';
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

    const byEndpoint = new Map<string, { fields: string[]; body: Record<string, unknown> }>();
    for (const [_key, entry] of pending) {
      const endpoint = FIELD_ENDPOINTS[entry.fieldPath];
      if (!endpoint) continue;
      let batch = byEndpoint.get(endpoint);
      if (!batch) {
        batch = { fields: [], body: {} };
        byEndpoint.set(endpoint, batch);
      }
      batch.fields.push(entry.fieldPath);
      batch.body[entry.fieldPath] = entry.value;
    }

    for (const [endpoint, batch] of byEndpoint) {
      const url = `${environment.apiBaseUrl}api/results/${endpoint.replace('{id}', String(resultId))}`;

      try {
        this.http.patch(url, batch.body).subscribe({
          next: () => {
            batch.fields.forEach(field => {
              this.fieldStatus.update(s => ({ ...s, [field]: 'saved' }));
              setTimeout(() => {
                this.fieldStatus.update(s => {
                  const next = { ...s };
                  if (next[field] === 'saved') next[field] = 'idle';
                  return next;
                });
              }, 2000);
            });
          },
          error: () => {
            batch.fields.forEach(field => {
              this.fieldStatus.update(s => ({ ...s, [field]: 'error' }));
            });
          }
        });
      } catch {
        batch.fields.forEach(field => {
          this.fieldStatus.update(s => ({ ...s, [field]: 'error' }));
        });
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
  }

  private _currentResultId = signal<number | null>(null);
  setResultId(id: number): void {
    this._currentResultId.set(id);
  }

  private flushField(fieldPath: string, value: unknown): void {
    this._pendingFields.set(fieldPath, { fieldPath, value, fieldType: 'text' });
    this.hasPendingSaves.set(true);
    this.flush();
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
    const indicatorId = tocData.indicator_id ? Number(tocData.indicator_id) : undefined;
    const contributing = tocData.contributing_indicator !== undefined && tocData.contributing_indicator !== null
      ? Number(tocData.contributing_indicator) : undefined;

    const body: any = {
      result_toc_result: {
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

    const url = `${environment.apiBaseUrl}api/results/../bilateral/center/toc-mapping/${resultId}`;

    this.fieldStatus.update(s => ({ ...s, toc_mapping: 'saving' }));
    this.http.patch(url, body).subscribe({
      next: () => {
        this.fieldStatus.update(s => ({ ...s, toc_mapping: 'saved' }));
        setTimeout(() => {
          this.fieldStatus.update(s => {
            const next = { ...s };
            if (next['toc_mapping'] === 'saved') next['toc_mapping'] = 'idle';
            return next;
          });
        }, 2000);
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

    const url = `${environment.apiBaseUrl}api/results/../bilateral/center/contributors/${resultId}`;

    this.fieldStatus.update(s => ({ ...s, contributors: 'saving' }));
    this.http.patch(url, contributorsData).subscribe({
      next: () => {
        this.fieldStatus.update(s => ({ ...s, contributors: 'saved' }));
        setTimeout(() => {
          this.fieldStatus.update(s => {
            const next = { ...s };
            if (next['contributors'] === 'saved') next['contributors'] = 'idle';
            return next;
          });
        }, 2000);
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
    toc_progressive_narrative: string | null;
  }> {
    const resultId = this._currentResultId();
    if (!resultId) {
      return Promise.resolve({
        planned_result: null,
        toc_level_id: null,
        toc_result_id: null,
        indicator_id: null,
        toc_progressive_narrative: null,
      });
    }

    const url = `${environment.apiBaseUrl}api/bilateral/center/toc-state/${resultId}`;
    return new Promise((resolve) => {
      this.http.get<any>(url).subscribe({
        next: ({ response }) => {
          resolve({
            planned_result: response?.planned_result ?? null,
            toc_level_id: response?.toc_level_id ?? null,
            toc_result_id: response?.toc_result_id ?? null,
            indicator_id: response?.indicator_id ?? null,
            toc_progressive_narrative: response?.toc_progressive_narrative ?? null,
          });
        },
        error: () => {
          resolve({
            planned_result: null,
            toc_level_id: null,
            toc_result_id: null,
            indicator_id: null,
            toc_progressive_narrative: null,
          });
        },
      });
    });
  }
}
