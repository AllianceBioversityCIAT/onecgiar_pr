import { ChangeDetectionStrategy, Component, inject, Input, OnInit, signal } from '@angular/core';
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
  @Input() resultDetail: BilateralResultDetail;

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
        // Get Long-term and Short-term options (indices 2 and 3 after splice)
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
