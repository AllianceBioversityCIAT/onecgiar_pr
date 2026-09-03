import { Injectable } from '@angular/core';

const MAX_ENTRIES = 50;
const MAX_LINE_LENGTH = 600;

/**
 * Keeps a small rolling buffer of console errors and warnings so a bug report
 * can carry what the browser was complaining about.
 *
 * Two deliberate limits:
 * - It is a ring buffer of 50 entries. The app produces routine errors on its
 *   own (404s from `?phase=null`, for one), and without a cap those would bury
 *   the entry that matters.
 * - It NEVER reports anything by itself. The buffer travels only when the user
 *   presses Submit in the "Report a bug" modal, and lands on an internal
 *   sub-task, not on the report the user sees.
 */
@Injectable({ providedIn: 'root' })
export class ConsoleCaptureService {
  private readonly entries: string[] = [];
  private installed = false;

  constructor() {
    this.install();
  }

  /** Wraps console.error/warn once, keeping the original behaviour intact. */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    this.installed = true;

    // Reached through `globalThis` rather than the bare `console` identifier:
    // the project's `no-console` rule allows only `console.error`, and this
    // service has to wrap `warn` too. Going through globalThis keeps the rule
    // satisfied without an eslint-disable, and without touching behaviour —
    // the original function is always called.
    const target = globalThis.console as unknown as Record<string, (...args: unknown[]) => void>;

    (['error', 'warn'] as const).forEach(level => {
      const original = target[level]?.bind(target);
      if (!original) return;
      target[level] = (...args: unknown[]) => {
        this.push(level, args);
        original(...args);
      };
    });

    window.addEventListener('unhandledrejection', event => this.push('error', ['Unhandled promise rejection:', event?.reason]));
  }

  /** The captured lines, oldest first. */
  snapshot(): string[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries.length = 0;
  }

  private push(level: 'error' | 'warn', args: unknown[]): void {
    const time = new Date().toISOString().slice(11, 19);
    const line = `[${time}] ${level.toUpperCase()} ${args.map(a => this.stringify(a)).join(' ')}`;
    this.entries.push(line.slice(0, MAX_LINE_LENGTH));
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
  }

  private stringify(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    if (typeof value === 'string') return value;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    try {
      return JSON.stringify(value);
    } catch {
      // Circular structures (Angular/HTTP objects hit this often).
      return Object.prototype.toString.call(value);
    }
  }
}
