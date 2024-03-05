import { Component, OnInit, Input } from '@angular/core';
import { TypeOneReportService } from '../../../../../pages/type-one-report/type-one-report.service';
import { ApiService } from '../../../../services/api/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrSelectComponent } from '../../../../../custom-fields/pr-select/pr-select.component';

@Component({
  selector: 'app-tor-krs-primary-impact-area-selector',
  standalone: true,
  templateUrl: './tor-krs-primary-impact-area-selector.component.html',
  styleUrls: ['./tor-krs-primary-impact-area-selector.component.scss'],
  imports: [CommonModule, FormsModule, PrSelectComponent]
})
export class TorKrsPrimaryImpactAreaSelectorComponent {
  isSaving = false;
  @Input() flatFormat: boolean;
  @Input() selectOptions;
  @Input() result_code;
  constructor(
    public typeOneReportSE: TypeOneReportService,
    private api: ApiService
  ) {}

  get resultIndex() {
    return this.typeOneReportSE.keyResultStoryData.findIndex(
      item => item.result_code == this.result_code
    );
  }

  impactAreaName(index) {
    //(index);
    //(this.selectOptions);
    //(this.typeOneReportSE.keyResultStoryData[index]?.impact_area_id);
    //(this.selectOptions?.find(item => item.id_impactArea == this.typeOneReportSE.keyResultStoryData[index]?.impact_area_id));
    const impactReaObject = this.selectOptions?.find(
      item =>
        item.id_impactArea ==
        this.typeOneReportSE.keyResultStoryData[index]?.impact_area_id
    );
    return impactReaObject?.nameImpact;
  }
}
