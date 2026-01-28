import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnInit, signal } from '@angular/core';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-cap-sharing-content',
  imports: [CustomFieldsModule, CommonModule, FormsModule],
  templateUrl: './cap-sharing-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CapSharingContentComponent implements OnInit {
  @Input() set resultDetail(value: BilateralResultDetail) {
    if (!value) {
      this._resultDetail = value;
      return;
    }

    // Modify the original object to ensure changes are reflected in the parent
    if (!value.resultTypeResponse || !Array.isArray(value.resultTypeResponse) || value.resultTypeResponse.length === 0) {
      value.resultTypeResponse = [{
        result_capacity_development_id: null,
        male_using: null,
        female_using: null,
        non_binary_using: null,
        has_unkown_using: null,
        capdev_delivery_method_id: null,
        capdev_term_id: null
      } as any];
    } else {
      // Ensure all required properties exist in the existing object (modify original)
      const firstItem: any = value.resultTypeResponse[0];
      if (firstItem.male_using === undefined) firstItem.male_using = null;
      if (firstItem.female_using === undefined) firstItem.female_using = null;
      if (firstItem.non_binary_using === undefined) firstItem.non_binary_using = null;
      if (firstItem.has_unkown_using === undefined) firstItem.has_unkown_using = null;
      if (firstItem.capdev_delivery_method_id === undefined) firstItem.capdev_delivery_method_id = null;
      if (firstItem.capdev_term_id === undefined) firstItem.capdev_term_id = null;
    }

    // Store reference to the original object (not a copy) so changes are reflected
    this._resultDetail = value;
    this.cdr.markForCheck();
  }
  get resultDetail(): BilateralResultDetail {
    return this._resultDetail;
  }
  private _resultDetail: BilateralResultDetail;

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly api = inject(ApiService);

  capdevsTerms = signal<any[]>([]);
  deliveryMethodOptions = signal<any[]>([]);

  ngOnInit(): void {
    this.loadCapdevsTerms();
    this.loadDeliveryMethods();
  }

  private loadCapdevsTerms(): void {
    this.api.resultsSE.GET_capdevsTerms().subscribe({
      next: ({ response }) => {
        const terms = response.slice(2, 4);
        this.capdevsTerms.set(terms);
      },
      error: () => this.capdevsTerms.set([])
    });
  }

  private loadDeliveryMethods(): void {
    this.api.resultsSE.GET_capdevsDeliveryMethod().subscribe({
      next: ({ response }) => {
        this.deliveryMethodOptions.set(response);
      },
      error: () => this.deliveryMethodOptions.set([])
    });
  }

  getTotalParticipants(): number {
    return (
      Number(this.resultDetail?.resultTypeResponse?.[0]?.male_using || 0) +
      Number(this.resultDetail?.resultTypeResponse?.[0]?.female_using || 0) +
      Number(this.resultDetail?.resultTypeResponse?.[0]?.non_binary_using || 0) +
      Number(this.resultDetail?.resultTypeResponse?.[0]?.has_unkown_using || 0)
    );
  }

  lengthOfTrainingDescription(): string {
    return `<ul>
    <li>Long-term training refers to training that goes for 3 or more months.</li>
    <li>Short-term training refers to training that goes for less than 3 months.</li>
    </ul>`;
  }
}
