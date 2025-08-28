import { Component, Input } from '@angular/core';
import { TypeOneReportService } from '../../../../../pages/type-one-report/type-one-report.service';

@Component({
    selector: 'app-tor-krs-others-primary-impact-area',
    templateUrl: './tor-krs-others-primary-impact-area.component.html',
    styleUrls: ['./tor-krs-others-primary-impact-area.component.scss'],
    standalone: false
})
export class TorKrsOthersPrimaryImpactAreaComponent {
  constructor(public typeOneReportSE: TypeOneReportService) {}
  @Input() result_code;

  getImpactAreasList(keyResultStoryData) {
    let impact_areas = [];
    if (keyResultStoryData?.impact_areas) {
      impact_areas = JSON.parse(keyResultStoryData.impact_areas);
    }
    let text = '';
    impact_areas?.forEach(element => {
      text += `${element.nameImpact}${'; '}`;
    });
    text = text.substring(0, text.length - 2);
    text += '<br>';
    return text;
  }

  get resultIndex() {
    return this.typeOneReportSE?.keyResultStoryData?.findIndex(item => item.result_code == this.result_code);
  }
}
