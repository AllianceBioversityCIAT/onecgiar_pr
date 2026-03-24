import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BilateralKeyword, BilateralResultDetail } from '../../result-review-drawer.interfaces';

@Component({
  selector: 'app-kp-content',
  imports: [],
  templateUrl: './kp-content.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpContentComponent {
  @Input() resultDetail: BilateralResultDetail;

  getRegularKeywords(): BilateralKeyword[] {
    const keywords = this.resultDetail?.resultTypeResponse?.[0]?.keywords ?? [];
    return keywords.filter(k => !k.is_agrovoc);
  }

  getAgrovocKeywords(): BilateralKeyword[] {
    const keywords = this.resultDetail?.resultTypeResponse?.[0]?.keywords ?? [];
    return keywords.filter(k => k.is_agrovoc);
  }
}
