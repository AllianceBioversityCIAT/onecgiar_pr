import { Injectable, signal } from '@angular/core';

export interface MetadataPanelPosition {
  x: number;
  y: number;
}

/** Shape persisted under {@link STORAGE_KEY}. */
interface StoredPanelState {
  floating: boolean;
  position: MetadataPanelPosition;
}

/** Project convention: every localStorage key this app owns starts with `pr-`. */
const STORAGE_KEY = 'pr-result-metadata-panel';

/** Must match the floating card's `w-[280px]` — the clamp keeps the whole card reachable. */
export const METADATA_PANEL_WIDTH = 280;

/**
 * Conservative height estimate for the clamp. The card is six short rows plus a title bar; an
 * exact measurement would mean reading the DOM from a service, and being a few pixels generous
 * only means the card can never be dropped past the fold.
 */
export const METADATA_PANEL_HEIGHT = 210;

/** Breathing room between the card and the viewport edges. Same value the AI assistant uses. */
const MARGIN = 12;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Open/closed state and screen position of the RESULT METADATA card.
 *
 * Root-scoped on purpose: `PrmsRouteReuseStrategy` destroys and re-creates `ResultDetailComponent`
 * whenever the `:id` segment changes, so anything held by that component (or by the floating card
 * itself) would reset on exactly the interaction the user expects to be preserved — switching from
 * one result to the next. Keeping it here also survives a reload, via localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ResultMetadataPanelService {
  /** `false` = docked in the result-detail header; `true` = free-floating window. */
  readonly floating = signal(false);

  /** Viewport coordinates of the floating card's top-left corner. */
  readonly position = signal<MetadataPanelPosition>({ x: 0, y: 0 });

  constructor() {
    const stored = this.readStored();
    this.floating.set(stored?.floating ?? false);
    // Clamp on READ as well as on drop: a position saved on a 2560px monitor would otherwise
    // restore off-screen on a laptop, leaving the card unreachable with no way to bring it back.
    this.position.set(this.clampToViewport(stored?.position ?? ResultMetadataPanelService.defaultPosition()));
  }

  open(): void {
    this.floating.set(true);
    this.persist();
  }

  close(): void {
    this.floating.set(false);
    this.persist();
  }

  toggle(): void {
    this.floating.update(open => !open);
    this.persist();
  }

  setPosition(position: MetadataPanelPosition): void {
    this.position.set(this.clampToViewport(position));
    this.persist();
  }

  /** Keeps the card fully inside the viewport — used on drop and on window resize. */
  clampToViewport(position: MetadataPanelPosition): MetadataPanelPosition {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    return {
      x: clamp(Math.round(position?.x ?? 0), MARGIN, vw - METADATA_PANEL_WIDTH - MARGIN),
      y: clamp(Math.round(position?.y ?? 0), MARGIN, vh - METADATA_PANEL_HEIGHT - MARGIN)
    };
  }

  /** Top-right of the viewport: clear of the sidebar and of the detail's content column. */
  private static defaultPosition(): MetadataPanelPosition {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    return { x: Math.max(MARGIN, vw - METADATA_PANEL_WIDTH - 24), y: 96 };
  }

  private readStored(): StoredPanelState | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: any = raw ? JSON.parse(raw) : null;
      if (!parsed || typeof parsed !== 'object') return null;
      const position = parsed.position;
      const hasPosition = position && typeof position.x === 'number' && typeof position.y === 'number';
      return {
        floating: parsed.floating === true,
        position: hasPosition ? { x: position.x, y: position.y } : ResultMetadataPanelService.defaultPosition()
      };
    } catch {
      // Malformed or unavailable storage must never take the result detail down: the panel
      // simply starts from its default place.
      return null;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ floating: this.floating(), position: this.position() }));
    } catch {
      // Private browsing / quota errors: the panel stays session-only rather than throwing.
    }
  }
}
