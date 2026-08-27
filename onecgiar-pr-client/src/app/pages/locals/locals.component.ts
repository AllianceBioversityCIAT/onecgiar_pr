import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

interface LocalEntry {
  key: string;
  value: string;
  /** true for keys that hold credentials/tokens — masked by default. */
  sensitive: boolean;
}

/** Keys whose value is masked on screen until the user reveals them. */
const SENSITIVE_KEYS = ['token', 'auth', 'password', 'secret'];

/**
 * `/locals` — dev-only utility to share the full localStorage (session) between browsers.
 * Reads every localStorage key, lets you copy it as JSON to the clipboard, and paste a
 * previously-copied dump into this browser (then reloads). Companion to the Option+T / Option+P
 * shortcut in app.component.ts. Never exposed in production.
 */
@Component({
  selector: 'app-locals',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './locals.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocalsComponent implements OnInit {
  readonly isProduction = environment.production;

  readonly entries = signal<LocalEntry[]>([]);
  readonly revealed = signal<Record<string, boolean>>({});
  readonly feedback = signal<{ text: string; ok: boolean } | null>(null);

  readonly count = computed(() => this.entries().length);

  ngOnInit(): void {
    this.refresh();
  }

  /** Re-read the whole localStorage into the table. */
  refresh(): void {
    const list: LocalEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === null) continue;
      const value = localStorage.getItem(key) ?? '';
      list.push({ key, value, sensitive: SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s)) });
    }
    list.sort((a, b) => a.key.localeCompare(b.key));
    this.entries.set(list);
  }

  toggleReveal(key: string): void {
    this.revealed.update(r => ({ ...r, [key]: !r[key] }));
  }

  isRevealed(key: string): boolean {
    return !!this.revealed()[key];
  }

  /** Copy the full localStorage as a JSON object to the clipboard. */
  copyAll(): void {
    const data: Record<string, string> = {};
    this.entries().forEach(e => (data[e.key] = e.value));
    navigator.clipboard
      .writeText(JSON.stringify(data))
      .then(() => this.setFeedback(`Copied ${this.count()} keys to clipboard`, true))
      .catch(err => this.setFeedback(`Copy failed: ${err}`, false));
  }

  /** Read a JSON dump from the clipboard, write every key into localStorage, then reload. */
  paste(): void {
    navigator.clipboard
      .readText()
      .then(text => {
        const data = JSON.parse(text) as Record<string, string>;
        const keys = Object.keys(data);
        keys.forEach(key => localStorage.setItem(key, data[key]));
        this.setFeedback(`Pasted ${keys.length} keys — reloading…`, true);
        setTimeout(() => window.location.reload(), 600);
      })
      .catch(err => this.setFeedback(`Paste failed (is the clipboard a valid JSON dump?): ${err}`, false));
  }

  private setFeedback(text: string, ok: boolean): void {
    this.feedback.set({ text, ok });
  }
}
