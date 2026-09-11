import { Injectable, computed, signal } from '@angular/core';

export interface SidebarLayout {
  /** Reserved left column width in px (full-height sidebar). */
  width: number;
}

/**
 * Holds the current page's sidebar layout so the global shell (app.component +
 * header-panel) can shift the navbar/content to the right of a full-height sidebar.
 *
 * Seeded declaratively from route `data.sidebar` on NavigationEnd; collapsible
 * sidebars (e.g. dynamic-panel-menu) can override the live width via `setWidth`.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  /** Current sidebar config, or null when the route has no sidebar. */
  readonly sidebar = signal<SidebarLayout | null>(null);

  /** Left offset (px) the navbar/content must leave for the sidebar (0 = none). */
  readonly leftOffset = computed(() => this.sidebar()?.width ?? 0);

  /** Whether the current route renders a full-height sidebar. */
  readonly hasSidebar = computed(() => this.sidebar() !== null);

  /** Seed/clear from route data on navigation. */
  setSidebar(config: SidebarLayout | null): void {
    this.sidebar.set(config);
  }

  /** Update the live width (collapsible sidebars). No-op if no sidebar active. */
  setWidth(width: number): void {
    const current = this.sidebar();
    if (current && current.width !== width) {
      this.sidebar.set({ ...current, width });
    }
  }
}
