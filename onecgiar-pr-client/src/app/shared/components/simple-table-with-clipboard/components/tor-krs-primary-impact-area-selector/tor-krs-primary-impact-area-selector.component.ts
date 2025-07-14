import { Component, Input } from '@angular/core';
import { TypeOneReportService } from '../../../../../pages/type-one-report/type-one-report.service';

@Component({
    selector: 'app-tor-krs-primary-impact-area-selector',
    templateUrl: './tor-krs-primary-impact-area-selector.component.html',
    styleUrls: ['./tor-krs-primary-impact-area-selector.component.scss'],
    standalone: false
})
export class TorKrsPrimaryImpactAreaSelectorComponent {
  isSaving = false;
  @Input() flatFormat: boolean;
  @Input() selectOptions;
  @Input() result_code;
  constructor(public typeOneReportSE: TypeOneReportService) {}

  get resultIndex() {
    return this.typeOneReportSE.keyResultStoryData.findIndex(item => item.result_code == this.result_code);
  }

  impactAreaName(index) {
    const impactReaObject = this.selectOptions?.find(item => item.id_impactArea == this.typeOneReportSE.keyResultStoryData[index]?.impact_area_id);
    return impactReaObject?.nameImpact;
  }
}
