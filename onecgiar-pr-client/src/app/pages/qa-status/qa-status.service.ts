import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { QaStatusBoard } from './qa-status.interfaces';

/**
 * Loads the QA status board from a static JSON asset served at
 * `./assets/qa-status/perf-refactor.json`.
 *
 * The board is a RUNTIME fetch of a static file: updating statuses, metrics,
 * or items only requires editing the JSON — no recompile needed. The request
 * is same-origin, so the interceptor's `auth` header is harmless. NO LLM /
 * external API is involved.
 */
@Injectable({ providedIn: 'root' })
export class QaStatusService {
  private readonly http = inject(HttpClient);

  readonly board = signal<QaStatusBoard | null>(null);
  readonly loadError = signal(false);

  load(): void {
    this.GET_qaStatusBoard();
  }

  GET_qaStatusBoard(): void {
    this.http.get<QaStatusBoard>('./assets/qa-status/perf-refactor.json').subscribe({
      next: data => {
        this.board.set(data);
        this.loadError.set(false);
      },
      error: () => this.loadError.set(true)
    });
  }
}
