import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { BilateralQualityAssessmentUiService } from '../../services/bilateral-quality-assessment-ui.service';

/**
 * The AI's verdict next to one form field, with its section's comments one click away.
 *
 * QA feedback (2026-09-18): *"by the time I go to my result I forget what the AI instructed"*. The
 * verdict window is modal and gone; this keeps the finding where the correction happens.
 *
 * ⚠️ The comments shown are the **section's**, not the field's. `sections[key].fields` is a
 * section-level list of the fields the feedback concerns and is not paired with `issues` — the AI
 * returned 1 issue and 4 fields for `geographic_location`. Pretending otherwise would attribute a
 * comment to a field the AI never tied it to.
 *
 * Renders nothing at all unless the field is flagged amber or red on a current assessment, so it is
 * safe to drop next to any field.
 */
@Component({
  selector: 'app-bilateral-field-quality-flag',
  imports: [],
  templateUrl: './bilateral-field-quality-flag.component.html',
  styleUrl: './bilateral-field-quality-flag.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BilateralFieldQualityFlagComponent {
  private readonly qualityAssessment = inject(BilateralQualityAssessmentUiService);

  /** The AI section key, e.g. `general_information`. */
  readonly section = input.required<string>();
  /**
   * The AI field name, e.g. `description` — same spelling the outbound payload uses.
   * Omitted, the note speaks for the whole section: that is the form the reporter meets after
   * following "Go to <section>" from the verdict window.
   */
  readonly field = input<string | null>(null);

  readonly open = signal(false);
  readonly copied = signal(false);

  readonly forField = computed(() => !!this.field());
  readonly flag = computed(() => {
    const field = this.field();
    return field
      ? this.qualityAssessment.flagForField(this.section(), field)
      : this.qualityAssessment.flagForSection(this.section());
  });
  readonly label = computed(() => (this.flag()?.verdict === 'red' ? 'Needs work' : 'Could be better'));

  /**
   * A rendering field marker tells the service, so the section-level note can step back instead of
   * repeating the same text above it. `onCleanup` covers both a verdict change and the component
   * being destroyed, so no separate teardown is needed. Tracks the RENDERED state, not merely the presence of this
   * component: a marker on a field the AI did not name shows nothing and must not silence the
   * section note.
   */
  private readonly registration = effect((onCleanup) => {
    if (!this.forField() || !this.flag()) return;
    const section = this.section();
    this.qualityAssessment.setFieldMarkerRendered(section, true);
    onCleanup(() => this.qualityAssessment.setFieldMarkerRendered(section, false));
  });

  toggle(): void {
    this.open.update((isOpen) => !isOpen);
    this.copied.set(false);
  }

  /** Copies the complete visible AI finding when the reporter clicks its text. */
  async copyFeedback(): Promise<void> {
    const finding = this.flag();
    if (!finding) return;

    const text = [
      this.forField() ? 'AI feedback for this field' : 'AI feedback for this section',
      ...finding.issues,
    ].join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const fallback = document.createElement('textarea');
        fallback.value = text;
        fallback.style.position = 'fixed';
        fallback.style.opacity = '0';
        document.body.appendChild(fallback);
        fallback.select();
        document.execCommand('copy');
        fallback.remove();
      }
      this.copied.set(true);
    } catch {
      // Copy can be blocked by the browser's permission policy. Keep the feedback readable.
      this.copied.set(false);
    }
  }
}
