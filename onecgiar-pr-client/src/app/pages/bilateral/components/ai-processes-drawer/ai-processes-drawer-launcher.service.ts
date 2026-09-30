import { Injectable, effect, inject } from '@angular/core';
import { HlmDialogService, type HlmDialogOptions } from '@spartan/dialog';
import type { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { AiProcessesDrawerHostComponent } from './ai-processes-drawer-host.component';
import { AI_PROCESSES_DRAWER_SHEET_CLASS } from './ai-processes-drawer.component';
import { BilateralAiService } from '../../services/bilateral-ai.service';

/**
 * The exact `HlmDialogService.open()` options the shell needs (`AIQ-DD-7`, a11y review):
 * `showCloseButton: false` because the drawer renders its OWN close button
 * (`ai-processes-drawer.component.html`'s `data-testid="ai-processes-drawer-close"`) — leaving
 * `HlmDialogContent`'s default `true` doubled it, visible but unreachable by Tab (attempt 1 a11y
 * FAIL). `closeOnOutsidePointerEvents: true` because Brain's own default is `false`, which left the
 * scrim not closing the drawer (`AIQ-R-9` A requires it). `ariaLabelledBy` points at the drawer's
 * own title id so the ONE dialog assistive tech reaches (CDK's container) has a name — `Brain`
 * only auto-wires this when `hlmDialogTitle` is used declaratively, which this imperative
 * `.open()` call never is. Exported so the P-18 CT probe (`ai-processes-drawer.cy.ts`) opens with
 * the IDENTICAL options, never a hand-copied drift.
 */
export const AI_PROCESSES_DRAWER_DIALOG_OPTIONS: Partial<HlmDialogOptions> = {
  contentClass: AI_PROCESSES_DRAWER_SHEET_CLASS,
  showCloseButton: false,
  closeOnOutsidePointerEvents: true,
  ariaLabelledBy: 'ai-processes-drawer-title',
};

/**
 * `ai-processes-drawer-launcher` (`AIQ-T-8`, `AIQ-DD-7` launcher) — the second half of the DD-7
 * shell: reacts to `BilateralAiService.drawerOpen()` and opens/closes the "AI processes" dialog
 * through `HlmDialogService`. Nothing in this repo instantiates this service yet — `AIQ-T-9`'s
 * trigger calls `BilateralAiService.openDrawer()` (already does, unchanged), which flips
 * `drawerOpen` to `true`; `AIQ-T-10` mounts this launcher app-wide (inject it once, e.g. alongside
 * `app-bilateral-ai-job-watcher` at the same headless mount point) so the effect below is always
 * listening, on every route, exactly like the watcher already does for polling. **Do not** wire
 * this into `app.component`/`app.module`/the header from THIS task (Leader adjudication).
 *
 * Reacting to `drawerOpen()` with an `effect()` here is explicitly allowed (Leader adjudication,
 * `AIQ-T-8` attempt 2): the spec's forward pointer bans calling `BilateralAiService.openDrawer()`
 * itself (which polls) from an effect; this effect only opens/closes the dialog shell, never calls
 * `openDrawer()`, so there is no re-entrancy risk.
 */
@Injectable({ providedIn: 'root' })
export class AiProcessesDrawerLauncherService {
  private readonly dialog = inject(HlmDialogService);
  private readonly service = inject(BilateralAiService);

  private currentRef: BrnDialogRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const open = this.service.drawerOpen();
      if (open) {
        if (this.currentRef) return; // guard against opening twice
        const ref = this.dialog.open(AiProcessesDrawerHostComponent, AI_PROCESSES_DRAWER_DIALOG_OPTIONS);
        this.currentRef = ref;
        ref.closed$.subscribe(() => {
          // Race guard (a11y-lens advisory): closing via the drawer's own button nulls
          // `currentRef` here only later, once `closed$` actually fires. If a re-open happens
          // inside that delay, `currentRef` already points at the NEW ref by the time this
          // callback runs — without the identity check it would null the new ref and set
          // `drawerOpen(false)` while the new dialog is still open.
          if (this.currentRef === ref) {
            this.currentRef = null;
            this.service.drawerOpen.set(false);
          }
        });
      } else if (this.currentRef) {
        this.currentRef.close();
        this.currentRef = null;
      }
    });
  }
}
