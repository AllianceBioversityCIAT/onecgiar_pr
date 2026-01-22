import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';

@Component({
  selector: 'app-cap-sharing-content',
  imports: [],
  templateUrl: './cap-sharing-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CapSharingContentComponent {
  @Input() resultDetail: BilateralResultDetail;

  getTotalParticipants(): number {
    return (
      Number(this.resultDetail?.resultTypeResponse?.[0]?.male_using || 0) +
      Number(this.resultDetail?.resultTypeResponse?.[0]?.female_using || 0) +
      Number(this.resultDetail?.resultTypeResponse?.[0]?.non_binary_using || 0) +
      Number(this.resultDetail?.resultTypeResponse?.[0]?.has_unkown_using || 0)
    );
  }
}
