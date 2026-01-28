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
  @Input() resultDetail: BilateralResultDetail;

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
