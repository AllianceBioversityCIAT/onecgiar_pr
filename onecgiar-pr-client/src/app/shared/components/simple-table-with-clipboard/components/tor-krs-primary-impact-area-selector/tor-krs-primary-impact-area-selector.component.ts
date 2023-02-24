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
}
