// @akili-spec notifications/primary-decline-rejects-result (PDR-T-3)
import { ChangeDetectionStrategy, Component, computed, effect, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrDialogComponent } from 'src/app/shared/components/pr-dialog/pr-dialog.component';
import { HlmButton } from '@spartan/button';
import { PRIMARY_DECLINE_JUSTIFICATION_COPY } from 'src/app/internationalization/primary-decline-justification.copy';

/**
 * Standalone presentational dialog for declining a **primary** program request (`PDR-R-1`).
 *
 * A copy of the W3/Bilateral "Reject result" dialog
 * (`result-review-drawer.component.html:849-877`): same `app-pr-dialog` chrome
 * (`confirmation-modal reject`), same required-textarea + Cancel/Confirm shape as the sibling
 * `save-changes-justification-dialog` (design.md §8.1). Unlike that sibling, this component OWNS
 * its own text state (not two-way bound from the caller) and resets it on every open, because the
 * caller never needs to read the in-progress draft — only the final trimmed value on Confirm.
 *
 * `ChangeDetectionStrategy.OnPush`: every piece `confirmDisabled` depends on (`text`, `isSaving`,
 * `confirmed`) MUST be a signal so the computed re-evaluates and the view updates WITHOUT a user
 * interaction. Attempt 2 wrote `confirmed`/`text` as plain fields mutated from an `effect()` — an
 * effect mutating a plain field never marks an OnPush view dirty, so after a 400 the guard was
 * released in state but Confirm stayed visually disabled until the user did something else
 * (caught by the PDR-T-4 Reviewer; reproduced NG0100 in the caller's own test). Keep both reactive.
 */
@Component({
  selector: 'app-primary-decline-justification-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, PrDialogComponent, HlmButton],
  templateUrl: './primary-decline-justification-dialog.component.html',
  styleUrl: './primary-decline-justification-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrimaryDeclineJustificationDialogComponent {
  readonly visible = model<boolean>(false);
  readonly resultCode = input<string>('');
  readonly programCode = input<string>('');
  readonly isSaving = input<boolean>(false);

  readonly cancelEvent = output<void>();
  /** Emits the trimmed justification. Guaranteed non-empty (Confirm is disabled otherwise). */
  readonly confirm = output<string>();

  readonly copy = PRIMARY_DECLINE_JUSTIFICATION_COPY;

  readonly title = computed(() => this.copy.title(this.resultCode()));
  readonly message = computed(() => this.copy.message(this.programCode()));

  /** Own state, not an `@Input` — the dialog resets it on every open (`PDR-R-1` "cancel" scenario). */
  readonly text = signal('');
  /**
   * Guards a double Confirm click from emitting twice before the caller's `isSaving` catches up
   * (same-tick double click, async round trip). Released as soon as an in-flight save ENDS
   * (`isSaving` true → false) — not only on reopen — so a 400 (which keeps the dialog open with
   * its text, `PDR-R-1` "server error" scenario) leaves Confirm usable again for a retry.
   */
  private readonly confirmed = signal(false);
  /**
   * Plain field, not a signal: read only synchronously inside the effect below, never by a
   * template binding or a `computed()` — so there is nothing for OnPush to miss by it staying
   * a plain field (unlike `text`/`confirmed`, which the Reviewer correctly flagged).
   */
  private wasSaving = false;

  readonly confirmDisabled = computed(() => !this.text().trim() || this.isSaving() || this.confirmed());

  constructor() {
    // Resets on every open, regardless of how the previous session ended (Cancel, Confirm, Escape, mask).
    effect(() => {
      if (this.visible()) {
        this.text.set('');
        this.confirmed.set(false);
        this.wasSaving = false;
      }
    });

    // Releases the double-click guard once the in-flight save ends, whether it succeeded (the
    // caller then closes the dialog, irrelevant) or failed with a 400 (the dialog stays open with
    // the text kept, and Confirm must become clickable again).
    effect(() => {
      const saving = this.isSaving();
      if (this.wasSaving && !saving) {
        this.confirmed.set(false);
      }
      this.wasSaving = saving;
    });
  }

  onCancel(): void {
    if (this.isSaving()) return;
    this.visible.set(false);
    this.cancelEvent.emit();
  }

  onConfirm(): void {
    if (this.confirmDisabled()) return;
    this.confirmed.set(true);
    this.confirm.emit(this.text().trim());
  }
}
