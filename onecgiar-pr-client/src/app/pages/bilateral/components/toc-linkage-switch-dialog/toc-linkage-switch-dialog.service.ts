import { inject, Injectable } from '@angular/core';
import { HlmDialogService } from '@spartan/dialog';
import { map, Observable } from 'rxjs';
import { TocLinkageSwitchDialogComponent, TocLinkageSwitchDialogResult } from './toc-linkage-switch-dialog.component';

/**
 * Opens the BIL-TOC-R-7 NO -> YES confirmation via `hlm-dialog`'s service API. Consumed by
 * `SectionTocComponent.onModeChange` when switching from `custom` to `project_default` with
 * saved custom values.
 */
@Injectable({ providedIn: 'root' })
export class TocLinkageSwitchDialogService {
  private readonly hlmDialogSE = inject(HlmDialogService);

  /**
   * `disableClose: true` blocks `hlm-dialog`'s default backdrop/outside-click/Escape auto-dismiss,
   * which would otherwise resolve `closed$` with `undefined`. The dialog's own explicit Escape
   * handler is the sole path that closes it on Escape, mapping it to `'cancel'` (the safer,
   * non-destructive outcome). `showCloseButton: false` removes the default "X" button, which
   * would otherwise be a third, undefined exit path. The `?? 'cancel'` below is a defensive
   * fallback only — every real close path already resolves explicitly.
   */
  openSwitchToDefault(): Observable<TocLinkageSwitchDialogResult> {
    const dialogRef = this.hlmDialogSE.open<TocLinkageSwitchDialogResult>(TocLinkageSwitchDialogComponent, {
      disableClose: true,
      showCloseButton: false,
      role: 'alertdialog',
      contentClass: 'sm:max-w-lg!',
    });

    return dialogRef.closed$.pipe(map((result) => result ?? 'cancel'));
  }
}
