// @akili-spec contribution-request-drawer (CRD-T-1, CRD-T-2)
// @akili-spec notifications/detail-side-panel (DSP-T-3)
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { HlmSheetImports } from '@spartan/sheet';

/**
 * DSP-T-3 (design.md §2.1/§6.2/§11, DD-3): thin sheet SHELL. Owns `open`, the sheet's accessible
 * name/description (`labelledBy`/`describedBy`, pointed at the projected content's own `h2[id]`
 * and header-sentence `p[id]` — see `notification-detail-content`) and the `closed` output for the
 * sheet's own scrim/Escape/outside-click dismissal. Every other input/output/method that used to
 * live here (header sentence, RESULT card, review tables, footer, `[crdAlign]` gating,
 * `needsMore`/expand, focus-scroll) moved to `app-notification-detail-content`, now projected in
 * via `<ng-content />` — `notification-item` wraps that component in `<ng-template #detailTpl>`
 * and renders it here via `ngTemplateOutlet` (design.md §2.2), so the SAME template instance can
 * later be portaled into the wide-screen `<aside>` without this shell's involvement.
 *
 * **DSP-T-3 attempt 2 fix (Reviewer FAIL issue 1):** `labelledBy`/`describedBy` bind to `<hlm-sheet>`
 * itself as `[aria-labelledby]`/`[aria-describedby]` — `BrnDialog` (which `HlmSheet`/`BrnSheet`
 * extend) declares these as inputs aliased to those exact attribute names
 * (`spartan-ng-brain-dialog.mjs` `ariaLabelledBy`/`ariaDescribedBy`, L318-319), and they flow
 * straight into the CDK dialog's own `role="dialog"` container via `_options()`
 * (`ariaLabelledBy`/`ariaDescribedBy` in the `open()` config, L212-213). Binding them on
 * `hlm-sheet-content` instead (attempt 1) put them on a role-less element AT ignores — the panel
 * had no accessible name in a real browser even though a jsdom test on that wrong node passed.
 *
 * The public selector, `open` contract, panel width (`!w-[720px] sm:!max-w-[720px]
 * max-[639px]:!w-screen`, CRD-P-9) and motion-reduce overrides (CRD-T-1 issue 2) are unchanged
 * (design.md §11 "the drawer's public selector stays the same").
 */
@Component({
  selector: 'app-contribution-request-drawer',
  imports: [HlmSheetImports],
  templateUrl: './contribution-request-drawer.component.html',
  styleUrl: './contribution-request-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContributionRequestDrawerComponent {
  /** Whether the sheet is shown. The parent (`notification-item`) owns this state (CRD-R-9). */
  readonly open = input(false);

  /**
   * DSP-T-3 (DD-3 "the shell sets aria-labelledby to the content heading id"): the id of the
   * projected content's own `h2`, so the sheet panel always has an accessible name. The caller
   * (`notification-item`) must pass the SAME value here and as the content's `headingId` input —
   * this component does not generate or validate it, it only forwards it onto `<hlm-sheet>`'s own
   * `aria-labelledby` input (`BrnDialog.ariaLabelledBy`, see class docstring).
   */
  readonly labelledBy = input<string | null>(null);

  /**
   * DSP-T-3 attempt 2 (Reviewer FAIL issue 1 remediation): the id of the projected content's
   * header-sentence `p[id]`, forwarded onto `<hlm-sheet>`'s own `aria-describedby` input. `null`
   * (the default) means no description — never a dangling idref pointing at an id that doesn't
   * exist (the CDK dialog defaults `ariaDescribedBy` to `brn-dialog-description-<id>` when the
   * input is left `undefined`, which this component never does: it always passes `null` or a real
   * id, both of which `BrnDialog` honors literally).
   */
  readonly describedBy = input<string | null>(null);

  /**
   * Fires on close by the sheet's own built-in scrim/Escape/outside-click (CRD-R-9). The projected
   * content's own ✕ button now emits ITS OWN `closed` output instead (see
   * `notification-detail-content`) — the caller wires both outputs to the same handler. This
   * component emits and does nothing else.
   */
  readonly closed = output<void>();
}
