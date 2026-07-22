import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { PolicyControlListService } from '../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../shared/services/global/institutions.service';

const TOTAL_FIELDS = 3;

@Component({
  selector: 'app-type-policy-change',
  imports: [CommonModule, FormsModule],
  templateUrl: './type-policy-change.component.html',
  styleUrl: './type-policy-change.component.scss',
})
export class TypePolicyChangeComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);
  readonly policyControlList = inject(PolicyControlListService);
  readonly institutionsService = inject(InstitutionsService);

  body: any = {};
  questions: any = {};
  relatedTo: number | null = null;
  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    this.bilateralApi.GET_policyChanges(resultId).subscribe(({ response }) => {
      this.body = response;
      this.updateMds();
    });
    this.bilateralApi.GET_policyChangesQuestions(resultId).subscribe(({ response }) => {
      this.questions = response;
      const selected = response?.optionsWithAnswers?.find((o: any) => o.answer_boolean === true);
      this.relatedTo = selected?.result_question_id ?? null;
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
    const filled =
      (this.body.policy_type_id ? 1 : 0) +
      (this.body.policy_stage_id ? 1 : 0) +
      (this.body.institutions?.length > 0 ? 1 : 0);
    this.mdsTracker.updateSection('type-specific', filled);
  }
}
