import { Component, inject, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { CustomFieldsModule } from '../../../../../custom-fields/custom-fields.module';
import { PolicyControlListService } from '../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../shared/services/global/institutions.service';
import { PrTooltipDirectiveModule } from '../../../../../shared/directives/pr-tooltip-directive.module';

const SECTION_NAME = 'type-specific';

const POLICY_TYPE_DESC = `<strong>Policy type guidance</strong> <ul>
<li><strong>Policy or strategy:</strong> Policies are written and formally approved decisions on, or commitments to, a particular course of action by an institution or organization (including but not limited to governments, NGOs, private sector). Strategies are high-level plans outlining how a particular course of action will be carried out. These documents show the intent of an organization or entity. Examples are country growth strategies, country agricultural policies, organization strategic plans or road maps. These documents set the goalposts but then require other instruments for implementation.</li>
<li><strong>Legal instrument:</strong> Legal instruments include laws, which are defined as Bills passed into law by the highest elected body (a parliament, congress or equivalent); or regulations, which are defined as rules or norms adopted by a government. These laws and regulations dictate very specifically actions and behaviors that are to be followed or prohibited and often include language on implications of non-compliance.</li>
<li><strong>Program, budget or investment:</strong> These are implementing mechanisms that often follow from a strategy, policy or law. There is typically a well-defined set of actions outlined over a specific period of time and with a specific budgetary amount attached. A National Agricultural Investment Plan is an example, the budget within a ministry is another, investments from the private sector fit here, as well as programs launched by multilateral, public, private and NGO sectors.</li>
</ul>`;

/** Shortened from the W1/W2 copy — bilateral has no partner-request flow to link to. */
const INSTITUTIONS_DESC = 'Select min 1, max 3 organizations.';

const STATUS_OPTIONS = [
  { id: 1, name: 'Confirmed' },
  { id: 2, name: 'Estimated' },
  { id: 3, name: 'Unknown' },
];

@Component({
  selector: 'app-type-policy-change',
  imports: [FormsModule, CustomFieldsModule, PrTooltipDirectiveModule],
  templateUrl: './type-policy-change.component.html',
  styleUrl: './type-policy-change.component.scss',
})
export class TypePolicyChangeComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);
  private readonly expandableState = inject(BilateralExpandableStateService);
  readonly policyControlList = inject(PolicyControlListService);
  readonly institutionsService = inject(InstitutionsService);

  body: any = {};
  questions: any = {};
  relatedTo: number | null = null;

  readonly statusOptions = STATUS_OPTIONS;
  readonly policyTypeDesc = POLICY_TYPE_DESC;
  readonly institutionsDesc = INSTITUTIONS_DESC;

  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');
  showAllFields = signal(false);

  ngOnInit(): void {
    const resultId = this.creationService.currentResultId();
    this.showAllFields.set(this.expandableState.getShowAllFields(resultId ?? 0, SECTION_NAME));
    this.loadData();
  }

  toggleShowAll(): void {
    this.showAllFields.update(v => !v);
    const resultId = this.creationService.currentResultId();
    this.expandableState.setShowAllFields(resultId ?? 0, SECTION_NAME, this.showAllFields());
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    this.bilateralApi.GET_policyChanges(resultId).subscribe(({ response }) => {
      this.body = response || {};
      this.updateMds();
    });
    this.bilateralApi.GET_policyChangesQuestions(resultId).subscribe(({ response }) => {
      this.questions = response || {};
      const selected = this.questions?.optionsWithAnswers?.find((o: any) => o.answer_boolean === true);
      this.relatedTo = selected?.result_question_id ?? null;
      this.updateMds();
    });
  }

  onRelatedToChange(questionId: number): void {
    this.questions.optionsWithAnswers?.forEach((o: any) => {
      o.answer_boolean = o.result_question_id === questionId ? true : null;
    });
    this.updateMds();
    this.queueTypeSave();
  }

  onFieldChange(): void {
    this.updateMds();
    this.queueTypeSave();
  }

  onSave(): void {
    this.queueTypeSave(0);
  }

  private queueTypeSave(debounceMs = 800): void {
    const payload = { ...this.body, ...this.questions };
    this.autoSave.schedulePayload('typeSpecific', payload, {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.bilateralApi.PATCH_policyChanges(resultId, body),
    });
  }

  updateMds(): void {
    this.mdsTracker.setSectionFields('type-specific', [
      { key: 'policy-type', label: 'Policy type', filled: !!this.body.policy_type_id },
      { key: 'policy-stage', label: 'Policy stage', filled: !!this.body.policy_stage_id },
      {
        key: 'related-to',
        label: this.questions?.question_text || 'Related to',
        filled: this.relatedTo != null,
      },
      {
        key: 'policy-institutions',
        label: 'Whose policy is this? (Implementing organizations)',
        filled: (this.body.institutions?.length ?? 0) > 0,
      },
    ]);
  }
}
