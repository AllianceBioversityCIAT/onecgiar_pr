import { Component, OnInit, Input } from '@angular/core';
import { TypeOneReportService } from '../../../../../pages/type-one-report/type-one-report.service';
import { ApiService } from '../../../../services/api/api.service';

@Component({
  selector: 'app-tor-krs-primary-impact-area-selector',
  templateUrl: './tor-krs-primary-impact-area-selector.component.html',
  styleUrls: ['./tor-krs-primary-impact-area-selector.component.scss']
})
export class TorKrsPrimaryImpactAreaSelectorComponent {
  isSaving = false;
  @Input() flatFormat: boolean;
  @Input() selectOptions;
  @Input() result_code;
  constructor(public typeOneReportSE: TypeOneReportService, private api: ApiService) {}

  get resultIndex() {
    return this.typeOneReportSE.keyResultStoryData.findIndex(item => item.result_code == this.result_code);
  }

  impactAreaName(index) {
    console.log(index);
    console.log(this.selectOptions);
    console.log(this.typeOneReportSE.keyResultStoryData[index]?.impact_area_id);
    console.log(this.selectOptions?.find(item => item.id_impactArea == this.typeOneReportSE.keyResultStoryData[index]?.impact_area_id));
    const impactReaObject = this.selectOptions?.find(item => item.id_impactArea == this.typeOneReportSE.keyResultStoryData[index]?.impact_area_id);
    return impactReaObject?.nameImpact;
  }
}
