import { ApplicationRef, inject, Injectable } from '@angular/core';

/**
 * Bridges "state changed outside Angular's knowledge" back into a render pass.
 *
 * Since the Angular 21 upgrade the app bootstraps **zoneless** (no `provideZoneChangeDetection()`
 * and `NgZone` resolves to `NoopNgZone`), so finishing an XHR or a `setTimeout` no longer schedules
 * change detection the way it did on Angular 19. Every component that stores its payload in plain —
 * non-signal — fields therefore keeps painting the state it had when the view was created: Result
 * Detail sections came up blank even though the data had already arrived.
 *
 * `schedule()` runs one pass from the root component, which mirrors the pre-upgrade behaviour for
 * these async boundaries without re-enabling zone.js patching of every DOM event (that revives the
 * infinite CD loop documented in docs/refactor-angular21-spartan-migration.md and freezes the page).
 *
 * This is a bridge, not a destination — the real fix is moving that state to signals, after which
 * these calls can be dropped one by one.
 */
@Injectable({ providedIn: 'root' })
export class ViewRefreshService {
  private readonly appRef = inject(ApplicationRef);

  schedule(): void {
    queueMicrotask(() => {
      try {
        this.appRef.components[0]?.changeDetectorRef.detectChanges();
      } catch {
        // A pass was already in flight (NG0103); it picks the new state up on its own.
      }
    });
  }
}
