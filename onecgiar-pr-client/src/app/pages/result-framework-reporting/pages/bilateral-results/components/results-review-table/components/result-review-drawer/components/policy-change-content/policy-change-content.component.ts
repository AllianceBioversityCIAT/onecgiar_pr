import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { PolicyControlListService } from '../../../../../../../../../../shared/services/global/policy-control-list.service';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';

@Component({
  selector: 'app-policy-change-content',
  imports: [CommonModule, FormsModule, CustomFieldsModule],
  templateUrl: './policy-change-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PolicyChangeContentComponent {
  @Input() resultDetail: BilateralResultDetail;

  policyControlListSE = inject(PolicyControlListService);
  institutionsService = inject(InstitutionsService);
}
