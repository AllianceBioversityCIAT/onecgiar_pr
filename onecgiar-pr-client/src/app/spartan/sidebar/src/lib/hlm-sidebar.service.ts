import { isPlatformServer } from '@angular/common';
import { afterNextRender, computed, DestroyRef, DOCUMENT, inject, Injectable, PLATFORM_ID, REQUEST, type Signal, signal } from '@angular/core';
import { injectHlmSidebarConfig } from './hlm-sidebar.token';

export type SidebarVariant = 'sidebar' | 'floating' | 'inset';

@Injectable({ providedIn: 'root' })
export class HlmSidebarService {
  private readonly _platformId = inject(PLATFORM_ID);
  private readonly _request = inject(REQUEST, { optional: true });
  private readonly _config = injectHlmSidebarConfig();
  private readonly _document = inject(DOCUMENT);
  private readonly _window = this._document.defaultView;
  private readonly _open = signal<boolean>(true);
  private readonly _openMobile = signal<boolean>(false);
  private readonly _isMobile = signal<boolean>(false);
  private readonly _isCompact = signal<boolean>(false);
  private readonly _variant = signal<SidebarVariant>('sidebar');
  private readonly _widthPx = signal<number>(260);
  private readonly _isResizing = signal<boolean>(false);
  private _defaultWidthApplied = false;
  private _restoredWidthFromStorage = false;
  private _suppressRailToggle = false;
  private _mediaQuery: MediaQueryList | null = null;
  private _compactMediaQuery: MediaQueryList | null = null;

  public readonly open: Signal<boolean> = this._open.asReadonly();
  public readonly openMobile: Signal<boolean> = this._openMobile.asReadonly();
  public readonly isMobile: Signal<boolean> = this._isMobile.asReadonly();
  public readonly isCompact: Signal<boolean> = this._isCompact.asReadonly();
  public readonly variant: Signal<SidebarVariant> = this._variant.asReadonly();
  public readonly widthPx: Signal<number> = this._widthPx.asReadonly();
  public readonly isResizing: Signal<boolean> = this._isResizing.asReadonly();
  public readonly sidebarWidthCss = computed(() => `${this._widthPx()}px`);

  public readonly state = computed<'expanded' | 'collapsed'>(() => (this._open() ? 'expanded' : 'collapsed'));

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.restoreStateFromCookie();
    this.restoreWidthFromStorage();

    afterNextRender(() => {
      if (!this._window || typeof this._window.matchMedia !== 'function') return;

      // Initialize MediaQueryList
      this._mediaQuery = this._window.matchMedia(`(max-width: ${this._config.mobileBreakpoint})`);
      this._isMobile.set(this._mediaQuery.matches);

      // Initialize the compact-breakpoint MediaQueryList
      this._compactMediaQuery = this._window.matchMedia(`(max-width: ${this._config.compactBreakpoint})`);
      this._isCompact.set(this._compactMediaQuery.matches);

      // Add media query listener
      const mediaQueryHandler = (e: MediaQueryListEvent) => {
        this._isMobile.set(e.matches);
        // If switching from mobile to desktop, close mobile sidebar
        if (!e.matches) this._openMobile.set(false);
      };
      this._mediaQuery.addEventListener('change', mediaQueryHandler);

      // Add compact-breakpoint media query listener
      const compactMediaQueryHandler = (e: MediaQueryListEvent) => {
        this._isCompact.set(e.matches);
      };
      this._compactMediaQuery.addEventListener('change', compactMediaQueryHandler);

      // Add keyboard shortcut listener
      const keydownHandler = (event: KeyboardEvent) => {
        if (event.key === this._config.sidebarKeyboardShortcut && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.toggleSidebar();
        }
      };
      this._window.addEventListener('keydown', keydownHandler);

      // Add resize listener with debounce
      let resizeTimeout: number;
      const resizeHandler = () => {
        if (!this._window) return;

        if (resizeTimeout) this._window.clearTimeout(resizeTimeout);
        resizeTimeout = this._window.setTimeout(() => {
          if (this._mediaQuery) this._isMobile.set(this._mediaQuery.matches);
          if (this._compactMediaQuery) this._isCompact.set(this._compactMediaQuery.matches);
        }, 100);
      };
      this._window.addEventListener('resize', resizeHandler);

      // Cleanup listeners on destroy
      destroyRef.onDestroy(() => {
        if (!this._window) return;

        if (this._mediaQuery) this._mediaQuery.removeEventListener('change', mediaQueryHandler);
        if (this._compactMediaQuery) this._compactMediaQuery.removeEventListener('change', compactMediaQueryHandler);
        this._window.removeEventListener('keydown', keydownHandler);
        this._window.removeEventListener('resize', resizeHandler);
        if (resizeTimeout) this._window.clearTimeout(resizeTimeout);
      });
    });
  }

  public setOpen(open: boolean): void {
    this._open.set(open);
    this._document.cookie = `${this._config.sidebarCookieName}=${open}; path=/; max-age=${this._config.sidebarCookieMaxAge}`;
  }

  /**
   * Forces the sidebar into the collapsed state as a transient, viewport-driven default —
   * unlike `setOpen()`, this does NOT persist to the sidebar cookie. Use this for automatic
   * collapse-on-entry behavior so a user's deliberately-chosen, cookie-persisted preference is
   * never silently overwritten.
   */
  public collapseForCompactEntry(): void {
    this._open.set(false);
  }

  public setOpenMobile(open: boolean): void {
    if (this._isMobile()) {
      this._openMobile.set(open);
    }
  }

  public setVariant(variant: SidebarVariant): void {
    this._variant.set(variant);
  }

  public toggleSidebar(): void {
    if (this._isMobile()) {
      this._openMobile.update(value => !value);
    } else {
      this.setOpen(!this._open());
    }
  }

  /** Seed width from the wrapper input when no stored preference exists yet. */
  public applyDefaultWidthFromCss(cssWidth: string): void {
    if (this._restoredWidthFromStorage || this._defaultWidthApplied) return;
    const px = this.parseCssWidthToPx(cssWidth);
    if (px) this._widthPx.set(this.clampWidth(px));
    this._defaultWidthApplied = true;
  }

  public setWidthPx(px: number, persist = true): void {
    const next = this.clampWidth(px);
    this._widthPx.set(next);
    if (persist) this.persistWidth(next);
  }

  public adjustWidthPx(delta: number): void {
    this.setWidthPx(this._widthPx() + delta);
  }

  public consumeRailToggleSuppression(): boolean {
    if (!this._suppressRailToggle) return false;
    this._suppressRailToggle = false;
    return true;
  }

  /** Drag the sidebar rail when expanded; persists width on release. */
  public startWidthResize(event: PointerEvent): void {
    if (this._isMobile() || this.state() !== 'expanded' || !this._window) return;

    this._isResizing.set(true);
    this._document.body.classList.add('sidebar-width-resizing');
    this._document.body.style.cursor = 'col-resize';
    this._document.body.style.userSelect = 'none';

    const startX = event.clientX;
    const startWidth = this._widthPx();
    let moved = false;

    const move = (e: PointerEvent) => {
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 2) moved = true;
      this.setWidthPx(startWidth + delta, false);
    };

    const finish = () => {
      this._isResizing.set(false);
      this._document.body.classList.remove('sidebar-width-resizing');
      this._document.body.style.cursor = '';
      this._document.body.style.userSelect = '';
      if (moved) {
        this._suppressRailToggle = true;
        this.persistWidth(this._widthPx());
      }
      this._window?.removeEventListener('pointermove', move);
      this._window?.removeEventListener('pointerup', finish);
      this._window?.removeEventListener('pointercancel', finish);
    };

    this._window.addEventListener('pointermove', move);
    this._window.addEventListener('pointerup', finish);
    this._window.addEventListener('pointercancel', finish);
  }

  private clampWidth(px: number): number {
    const viewportCap = Math.floor((this._window?.innerWidth ?? 1920) * 0.42);
    const max = Math.min(this._config.sidebarWidthMaxPx, viewportCap);
    return Math.min(Math.max(Math.round(px), this._config.sidebarWidthMinPx), max);
  }

  private parseCssWidthToPx(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.endsWith('px')) {
      const px = Number.parseFloat(trimmed);
      return Number.isFinite(px) ? px : null;
    }
    if (trimmed.endsWith('rem')) {
      const rem = Number.parseFloat(trimmed);
      if (!Number.isFinite(rem)) return null;
      const root = this._document.documentElement;
      const rootPx = Number.parseFloat(this._window?.getComputedStyle(root).fontSize ?? '16');
      return rem * (Number.isFinite(rootPx) ? rootPx : 16);
    }
    return null;
  }

  private persistWidth(px: number): void {
    if (isPlatformServer(this._platformId)) return;
    try {
      localStorage.setItem(this._config.sidebarWidthStorageKey, String(px));
    } catch {
      // Private browsing or storage disabled — width still applies for the session.
    }
  }

  private restoreWidthFromStorage(): void {
    if (isPlatformServer(this._platformId)) return;
    try {
      const raw = localStorage.getItem(this._config.sidebarWidthStorageKey);
      if (!raw) return;
      const px = Number.parseInt(raw, 10);
      if (!Number.isFinite(px)) return;
      this._widthPx.set(this.clampWidth(px));
      this._restoredWidthFromStorage = true;
      this._defaultWidthApplied = true;
    } catch {
      // Ignore storage read failures.
    }
  }

  private restoreStateFromCookie(): void {
    const cookieString = isPlatformServer(this._platformId) ? this._request?.headers.get('cookie') : this._document.cookie;

    if (!cookieString) return;

    const prefix = `${this._config.sidebarCookieName}=`;
    const cookieValue = cookieString
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(prefix))
      ?.slice(prefix.length);

    if (cookieValue !== undefined) {
      this._open.set(cookieValue === 'true');
    }
  }
}
