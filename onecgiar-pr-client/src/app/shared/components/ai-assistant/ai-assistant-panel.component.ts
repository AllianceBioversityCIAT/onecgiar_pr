import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AiAssistantService } from './ai-assistant.service';
import { MODEL_TIERS } from './engine/model-tiers';

interface WinRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type InteractionMode = 'drag' | ResizeDir;

const MIN_W = 340;
const MIN_H = 420;
const MARGIN = 12;
const DEFAULT_W = 400;
const DEFAULT_H = 640;
const STORAGE_KEY = 'prms-assistant-window';

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Floating assistant: a launcher FAB (bottom-right) plus a free-floating,
 * draggable + resizable window. Renders the orchestrator's states
 * (detecting / unsupported / opt-in / downloading / error / chat) inside a
 * window the user can reposition and resize; geometry persists to localStorage.
 * Tailwind-only, brand tokens, pointer-event driven (no extra deps).
 */
@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ai-assistant-panel.component.html',
  styleUrl: './ai-assistant-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiAssistantPanelComponent {
  readonly assistant = inject(AiAssistantService);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly draft = signal('');

  /** Window geometry (viewport-fixed). Initialized from storage or a bottom-right default. */
  readonly win = signal<WinRect>(this.initialRect());

  readonly winStyle = computed(() => {
    const r = this.win();
    return {
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      height: `${r.h}px`
    };
  });

  readonly downloadMB = computed(() => {
    const tier = this.assistant.tier();
    return tier === 'unsupported' ? 0 : MODEL_TIERS[tier].downloadMB;
  });

  readonly progressPct = computed(() => Math.round((this.assistant.progress()?.progress ?? 0) * 100));

  // Transient interaction state (not signals — mutated at pointer-event rate).
  private mode: InteractionMode | null = null;
  private startPointerX = 0;
  private startPointerY = 0;
  private startRect: WinRect = { x: 0, y: 0, w: 0, h: 0 };
  private pending: WinRect | null = null;
  private rafId = 0;

  constructor() {
    // Re-anchor to the default corner the first time it opens if geometry was never
    // touched by the user (keeps a fresh, sensible position on small viewports).
    effect(() => {
      if (this.assistant.isOpen() && !this.hasStored()) {
        this.win.set(this.defaultRect());
      }
    });
  }

  // ── Launcher / lifecycle ────────────────────────────────────────────────
  toggle(): void {
    this.assistant.toggle();
  }

  startDownload(): void {
    void this.assistant.startModel();
  }

  submit(): void {
    const text = this.draft().trim();
    if (!text) return;
    this.draft.set('');
    void this.assistant.send(text);
  }

  retry(): void {
    void this.assistant.startModel();
  }

  open(url: string): void {
    this.assistant.openUrl(url);
  }

  resetWindow(): void {
    this.win.set(this.defaultRect());
    this.persist();
  }

  // ── Drag ────────────────────────────────────────────────────────────────
  onHeaderPointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;
    // Don't start a drag when pressing an actual control inside the header.
    if ((event.target as HTMLElement).closest('button')) return;
    this.begin(event, 'drag');
  }

  // ── Resize ──────────────────────────────────────────────────────────────
  onResizePointerDown(event: PointerEvent, dir: ResizeDir): void {
    if (event.button !== 0) return;
    this.begin(event, dir);
  }

  private begin(event: PointerEvent, mode: InteractionMode): void {
    this.mode = mode;
    this.startPointerX = event.clientX;
    this.startPointerY = event.clientY;
    this.startRect = { ...this.win() };
    try {
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      /* pointer may no longer be active — capture is best-effort */
    }
    event.preventDefault();
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    document.body.style.userSelect = 'none';
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.mode) return;
    const dx = event.clientX - this.startPointerX;
    const dy = event.clientY - this.startPointerY;
    const s = this.startRect;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y, w, h } = s;

    if (this.mode === 'drag') {
      x = clamp(s.x + dx, MARGIN, vw - s.w - MARGIN);
      y = clamp(s.y + dy, MARGIN, vh - s.h - MARGIN);
    } else {
      const dir = this.mode;
      if (dir.includes('e')) w = clamp(s.w + dx, MIN_W, vw - s.x - MARGIN);
      if (dir.includes('s')) h = clamp(s.h + dy, MIN_H, vh - s.y - MARGIN);
      if (dir.includes('w')) {
        const nw = clamp(s.w - dx, MIN_W, s.x + s.w - MARGIN);
        x = s.x + (s.w - nw);
        w = nw;
      }
      if (dir.includes('n')) {
        const nh = clamp(s.h - dy, MIN_H, s.y + s.h - MARGIN);
        y = s.y + (s.h - nh);
        h = nh;
      }
    }

    this.pending = { x, y, w, h };
    if (!this.rafId) this.rafId = requestAnimationFrame(this.flush);
  };

  private readonly flush = (): void => {
    this.rafId = 0;
    if (this.pending) {
      this.win.set(this.pending);
      this.pending = null;
    }
  };

  private readonly onPointerUp = (): void => {
    this.mode = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    document.body.style.userSelect = '';
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.pending) {
      this.win.set(this.pending);
      this.pending = null;
    }
    this.persist();
  };

  @HostListener('window:resize')
  onViewportResize(): void {
    const r = this.win();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(r.w, vw - 2 * MARGIN);
    const h = Math.min(r.h, vh - 2 * MARGIN);
    const x = clamp(r.x, MARGIN, vw - w - MARGIN);
    const y = clamp(r.y, MARGIN, vh - h - MARGIN);
    this.win.set({ x, y, w, h });
    this.persist();
  }

  // ── Geometry helpers ─────────────────────────────────────────────────────
  private defaultRect(): WinRect {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const w = Math.min(DEFAULT_W, vw - 2 * MARGIN);
    const h = Math.min(DEFAULT_H, vh - 2 * MARGIN);
    const x = Math.max(MARGIN, vw - w - 20);
    const y = Math.max(MARGIN, vh - h - 20);
    return { x, y, w, h };
  }

  private initialRect(): WinRect {
    const stored = this.readStored();
    if (!stored) return this.defaultRect();
    // Clamp a previously-saved rect against the current viewport.
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const w = clamp(stored.w, MIN_W, vw - 2 * MARGIN);
    const h = clamp(stored.h, MIN_H, vh - 2 * MARGIN);
    const x = clamp(stored.x, MARGIN, vw - w - MARGIN);
    const y = clamp(stored.y, MARGIN, vh - h - MARGIN);
    return { x, y, w, h };
  }

  private hasStored(): boolean {
    return this.readStored() !== null;
  }

  private readStored(): WinRect | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (['x', 'y', 'w', 'h'].every(k => typeof parsed?.[k] === 'number')) return parsed as WinRect;
    } catch {
      /* ignore malformed / unavailable storage */
    }
    return null;
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.win()));
    } catch {
      /* ignore quota / unavailable storage */
    }
  }
}
