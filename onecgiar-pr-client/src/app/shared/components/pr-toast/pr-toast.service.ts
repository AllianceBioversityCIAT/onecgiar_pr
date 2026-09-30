import { Injectable, signal } from '@angular/core';

export type PrToastSeverity = 'success' | 'info' | 'warn' | 'error';

/** Optional action button rendered on a toast; running it dismisses the toast. */
export interface PrToastAction {
  label: string;
  run: () => void;
}

/** Mirrors the shape PrimeNG's MessageService.add() accepted in this app. */
export interface PrToastMessage {
  key?: string;
  severity?: PrToastSeverity;
  summary?: string;
  detail?: string;
  /** Auto-dismiss delay in ms (default 4000). Ignored when `sticky` is true. */
  life?: number;
  /** Optional focusable action button; running it dismisses the toast. */
  action?: PrToastAction;
  /** When true, the toast is not auto-removed — it stays until closed or acted on. */
  sticky?: boolean;
}

interface ActiveToast extends PrToastMessage {
  id: number;
  life: number;
}

/**
 * PrToastService — drop-in replacement for the PrimeNG MessageService used in
 * this app. Same `add({ key, severity, summary, detail })` contract, so call
 * sites only swap the injected type. Toasts are rendered by <app-pr-toast>.
 */
@Injectable({ providedIn: 'root' })
export class PrToastService {
  readonly toasts = signal<ActiveToast[]>([]);
  private seq = 0;

  add(message: PrToastMessage): void {
    const id = ++this.seq;
    const toast: ActiveToast = { ...message, id, life: message.life ?? 4000 };
    this.toasts.update(list => [...list, toast]);
    if (!message.sticky) {
      setTimeout(() => this.remove(id), toast.life);
    }
  }

  remove(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  /** Clear all toasts, or only those matching a key. */
  clear(key?: string): void {
    this.toasts.update(list => (key ? list.filter(t => t.key !== key) : []));
  }
}
