import { Injectable, signal, inject } from '@angular/core';
import { debounceTime, Subject } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { HttpClient } from '@angular/common/http';

export type FieldType = 'text' | 'select' | 'checkbox';
export type FieldStatus = 'idle' | 'saving' | 'saved' | 'error';

@Injectable({ providedIn: 'root' })
export class BilateralAutoSaveService {
  private readonly api = inject(ApiService);
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
    this._pendingFields.clear();
    this.hasPendingSaves.set(false);

    const patchData: Record<string, unknown> = {};
    pending.forEach(([_key, entry]) => {
      patchData[entry.fieldPath] = entry.value;
    });

    if (Object.keys(patchData).length === 0) return;

    const resultId = this._currentResultId();
    if (!resultId) return;

    try {
      this.http.patch(`${this.api.resultsSE.apiBaseUrl}${resultId}`, patchData).subscribe({
        next: () => {
          pending.forEach(([key]) => {
            this.fieldStatus.update(s => ({ ...s, [key]: 'saved' }));
            setTimeout(() => {
              this.fieldStatus.update(s => {
                const next = { ...s };
                if (next[key] === 'saved') next[key] = 'idle';
                return next;
              });
            }, 2000);
          });
        },
        error: () => {
          pending.forEach(([key]) => {
            this.fieldStatus.update(s => ({ ...s, [key]: 'error' }));
          });
        }
      });
    } catch {
      pending.forEach(([key]) => {
        this.fieldStatus.update(s => ({ ...s, [key]: 'error' }));
      });
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
