import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
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
  private readonly api = inject(ApiService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  readonly policyControlList = inject(PolicyControlListService);
  readonly institutionsService = inject(InstitutionsService);

  body: any = {};
  questions: any = {};
  relatedTo: number | null = null;
  saving = signal(false);

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    this.api.resultsSE.GET_policyChanges().subscribe(({ response }) => {
      this.body = response;
      this.updateMds();
    });
    this.api.resultsSE.GET_policyChangesQuestions().subscribe(({ response }) => {
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
  }

  onSave(): void {
    this.saving.set(true);
    const payload = { ...this.body, ...this.questions };
    this.api.resultsSE.PATCH_policyChanges(payload).subscribe({
      next: () => {
        this.loadData();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
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
