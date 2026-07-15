import { effect, Injectable, signal } from '@angular/core';

/**
 * Accessibility — user-controlled text size (WCAG 2.2 §1.4.4 Resize Text).
 *
 * The PRMS type scale is authored in absolute px (200+ hardcoded sites), so a
 * root `font-size` lever would not cascade. Instead this drives the CSS custom
 * property `--pr-font-scale`, consumed by `html { zoom: var(--pr-font-scale) }`
 * in styles.scss, which scales the whole app (px/em/rem + CDK overlays) from a
 * single point. It stacks on top of — never replaces — native browser zoom.
 *
 * The choice is persisted in localStorage and re-applied on bootstrap (an inline
 * script in index.html applies it before first paint to avoid a flash).
 */
export type FontScale = 'default' | 'large' | 'larger' | 'largest';

export interface FontScaleOption {
  value: FontScale;
  label: string;
  /** Multiplier applied via CSS `zoom`. */
  factor: number;
}

export const FONT_SCALE_OPTIONS: readonly FontScaleOption[] = [
  { value: 'default', label: 'Default', factor: 1 },
  { value: 'large', label: 'Large', factor: 1.15 },
  { value: 'larger', label: 'Larger', factor: 1.3 },
  { value: 'largest', label: 'Largest', factor: 1.5 }
];

const STORAGE_KEY = 'pr.a11y.fontScale';
const FACTOR_BY_SCALE = new Map<FontScale, number>(FONT_SCALE_OPTIONS.map(o => [o.value, o.factor]));

@Injectable({ providedIn: 'root' })
export class FontScaleService {
  readonly scale = signal<FontScale>(this.readInitial());

  constructor() {
    // Zoneless: this effect writes the CSS var + persists whenever the signal
    // changes. Applying the same value the bootstrap script already set is a
    // harmless no-op, so there is no flash on first run.
    effect(() => {
      const value = this.scale();
      const factor = FACTOR_BY_SCALE.get(value) ?? 1;
      document.documentElement.style.setProperty('--pr-font-scale', String(factor));
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // Storage may be unavailable (private mode / blocked) — scaling still works for the session.
      }
    });
  }

  set(value: FontScale): void {
    this.scale.set(value);
  }

  reset(): void {
    this.scale.set('default');
  }

  currentLabel(): string {
    return FONT_SCALE_OPTIONS.find(o => o.value === this.scale())?.label ?? 'Default';
  }

  private readInitial(): FontScale {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as FontScale | null;
      if (saved && FACTOR_BY_SCALE.has(saved)) return saved;
    } catch {
      // ignore
    }
    return 'default';
  }
}
