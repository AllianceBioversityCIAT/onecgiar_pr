import { Injectable, signal, inject } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export type FieldType = 'text' | 'select' | 'checkbox';
export type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';

const FIELD_ENDPOINTS: Record<string, string> = {
  title: 'bilateral/general-info/{id}',
  description: 'bilateral/general-info/{id}',
};

@Injectable({ providedIn: 'root' })
export class BilateralAutoSaveService {
  private readonly http = inject(HttpClient);

  private _pendingFields = new Map<string, { fieldPath: string; value: unknown; fieldType: FieldType }>();
  private _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _blurSubject = new Subject<{ fieldPath: string; value: unknown }>();

  fieldStatus = signal<Record<string, FieldStatus>>({});
  hasPendingSaves = signal(false);

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
}
