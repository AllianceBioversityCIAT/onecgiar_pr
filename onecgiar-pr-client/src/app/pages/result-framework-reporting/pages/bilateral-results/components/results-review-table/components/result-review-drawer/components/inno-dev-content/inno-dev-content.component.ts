import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BilateralResultDetail } from '../../result-review-drawer.interfaces';

@Component({
  selector: 'app-inno-dev-content',
  imports: [],
  templateUrl: './inno-dev-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InnoDevContentComponent {
  @Input() resultDetail: BilateralResultDetail;
}
