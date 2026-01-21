import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';

@Component({
  selector: 'app-policy-change-content',
  imports: [],
  templateUrl: './policy-change-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PolicyChangeContentComponent {
  @Input() resultDetail: BilateralResultDetail;
}
