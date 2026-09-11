import { Component, Input } from '@angular/core';
import { InnovationDevInfoBody } from '../../model/innovationDevInfoBody';
import { InnovationDevelopmentQuestions } from '../../model/InnovationDevelopmentQuestions.model';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

/**
 * P2-3272 / P2-3513 — the single Intellectual Property question of the 2026
 * Innovation Development form.
 *
 * Replaces the four IPR questions (private-sector engagement, co-investment,
 * formal IP rights, IP expert support) with one: "Do you have any Intellectual
 * Property considerations for this innovation?", answered Yes / Not sure / No.
 *
 * Only rendered from the 2026 phase onwards — earlier phases keep
 * `app-intellectual-property-rights` with their four questions and their stored
 * answers, which is the governing rule of epic P2-3243.
 *
 * The server serves it on the `q1` slot of the IPR group and resolves it BY TEXT
 * (`resolveIprSlotsForPhase`), so an environment where the migration has not run
 * yet leaves the slot `undefined` — hence the `@if (question)` guard in the
 * template, same contract as `app-stage-assessment`.
 */
@Component({
  selector: 'app-intellectual-property-considerations',
  templateUrl: './intellectual-property-considerations.component.html',
  styleUrls: ['./intellectual-property-considerations.component.scss'],
  standalone: false
})
export class IntellectualPropertyConsiderationsComponent {
  @Input() body = new InnovationDevInfoBody();
  @Input() options: InnovationDevelopmentQuestions;

  /**
   * Option labels that mean "the reporter wants IP support". Must match the stored
   * texts of the options inserted by 1788441000000-AddConsolidatedIprQuestionP25,
   * and the server's `CONSOLIDATED_IPR_TRIGGER_OPTION_TEXTS`.
   */
  static readonly TRIGGER_LABELS = ['Yes', 'Not sure'];

  /**
   * Info Point 2 of the story. Worded for submission time, not selection time:
   * the PO confirmed the emails leave when the result is submitted (Option B), and
   * the server trigger lives in `_sendIpExpertNotificationsIfNeeded` on submit.
   */
  readonly notificationDisclosure =
    "Answering Yes or Not sure will trigger an automatic email to the lead Center's IP focal point when you submit this result. They will contact you directly.";

  /**
   * Info Point 1 of the story: the link to the Intellectual Property definition.
   *
   * ⚠️ The story carries this URL with the note "exact URL to be confirmed with
   * Nicoleta Trifa", and the definition TEXT it also asks for was never provided.
   * So the link ships with the label the story itself uses and nothing invented
   * around it — better a working pointer to WIPO than an acceptance criterion left
   * unmet over a URL nobody has objected to. If Nicoleta names a different one, it
   * is this one constant.
   */
  readonly ipDefinitionUrl = 'https://www.wipo.int/about-ip/en/';

  readonly ipDefinitionLabel = 'What is Intellectual Property?';

  constructor(public innovationDevInfoUtilsSE: InnovationDevInfoUtilsService) {}

  get question() {
    return this.options?.intellectual_property_rights?.q1 as any;
  }

  get selectedOption() {
    const id = this.question?.['radioButtonValue'];
    return this.question?.options?.find((opt: any) => opt?.result_question_id == id);
  }

  /** True for "Yes" and "Not sure" — the answers that reveal the notice. */
  get isTriggerSelected(): boolean {
    return IntellectualPropertyConsiderationsComponent.TRIGGER_LABELS.includes(this.selectedOption?.question_text);
  }

  get isComplete(): boolean {
    return !!this.question?.['radioButtonValue'];
  }

  handleSelectionChange() {
    this.innovationDevInfoUtilsSE.mapBoolean(this.question);
  }
}
