import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { PolicyControlListService } from '../../../../../../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-policy-change-content',
  imports: [CommonModule, FormsModule, CustomFieldsModule],
  templateUrl: './policy-change-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PolicyChangeContentComponent implements OnChanges, OnInit, OnDestroy {
  private _resultDetail: BilateralResultDetail;
  @Input() disabled: boolean = false;

  @Input() set resultDetail(value: BilateralResultDetail) {
    if (!value) {
      this._resultDetail = value;
      return;
    }

    if (!value.resultTypeResponse || !Array.isArray(value.resultTypeResponse) || value.resultTypeResponse.length === 0) {
      value.resultTypeResponse = [
        {
          policy_type_id: null,
          policy_stage_id: null,
          implementing_organization: [],
          institutions: [],
          result_policy_change_id: null
        } as any
      ];
    } else {
      const firstItem: any = value.resultTypeResponse[0];
      if (firstItem.policy_type_id === undefined) firstItem.policy_type_id = null;
      if (firstItem.policy_stage_id === undefined) firstItem.policy_stage_id = null;
      if (!firstItem.implementing_organization || !Array.isArray(firstItem.implementing_organization)) {
        firstItem.implementing_organization = [];
      }
      if (!firstItem.institutions || !Array.isArray(firstItem.institutions)) {
        firstItem.institutions = [];
      }
      if (firstItem.result_policy_change_id === undefined) firstItem.result_policy_change_id = null;
    }

    this._resultDetail = value;

    setTimeout(() => {
      if (this.institutionsService.institutionsList && this.institutionsService.institutionsList.length > 0) {
        this.ensureInstitutionsMapped();
      }
      this.cdr.markForCheck();
    }, 0);
  }

  get resultDetail(): BilateralResultDetail {
    return this._resultDetail;
  }

  policyControlListSE = inject(PolicyControlListService);
  institutionsService = inject(InstitutionsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private institutionsLoadedSubscription: Subscription;

  ngOnInit(): void {
    this.institutionsLoadedSubscription = this.institutionsService.loadedInstitutions.subscribe(() => {
      if (this.resultDetail?.resultTypeResponse?.[0]) {
        this.ensureInstitutionsMapped();
      }
    });

    if (this.institutionsService.institutionsList && this.institutionsService.institutionsList.length > 0) {
      if (this.resultDetail?.resultTypeResponse?.[0]) {
        this.ensureInstitutionsMapped();
      }
    }
  }

  ngOnDestroy(): void {
    if (this.institutionsLoadedSubscription) {
      this.institutionsLoadedSubscription.unsubscribe();
    }
  }

  private ensureInstitutionsMapped(): void {
    if (!this.resultDetail?.resultTypeResponse?.[0]) return;

    const resultType = this.resultDetail.resultTypeResponse[0];

    if (
      resultType.implementing_organization &&
      Array.isArray(resultType.implementing_organization) &&
      resultType.implementing_organization.length > 0
    ) {
      if (!resultType.institutions || resultType.institutions.length === 0) {
        resultType.institutions = resultType.implementing_organization
          .map((org: any) => {
            const institutionId = org.institution_id || org.institutions_id || org.id;
            return institutionId ? Number(institutionId) : null;
          })
          .filter((id: any) => id !== null);

        setTimeout(() => {
          this.cdr.markForCheck();
        }, 0);
      }
    } else if (!resultType.institutions) {
      resultType.institutions = [];
      setTimeout(() => {
        this.cdr.markForCheck();
      }, 0);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resultDetail']) {
      if (this.institutionsService.institutionsList && this.institutionsService.institutionsList.length > 0) {
        this.ensureInstitutionsMapped();
      }
    }
  }
}
