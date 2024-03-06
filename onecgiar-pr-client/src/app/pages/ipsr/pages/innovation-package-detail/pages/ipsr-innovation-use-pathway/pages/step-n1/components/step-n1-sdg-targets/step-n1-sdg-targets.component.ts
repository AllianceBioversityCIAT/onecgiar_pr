import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrFieldHeaderComponent } from '../../../../../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrMultiSelectComponent } from '../../../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';

@Component({
  selector: 'app-step-n1-sdg-targets',
  standalone: true,
  templateUrl: './step-n1-sdg-targets.component.html',
  styleUrls: ['./step-n1-sdg-targets.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    PrFieldHeaderComponent,
    PrMultiSelectComponent
  ]
})
export class StepN1SdgTargetsComponent implements OnInit {
  currentsdgID = null;
  @Input() body = new IpsrStep1Body();
  sdgTargetLis = [];

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.GETAllClarisaSdgsTargets();
  }

  GETAllClarisaSdgsTargets() {
    this.api.resultsSE.GETAllClarisaSdgsTargets().subscribe({
      next: ({ response }) => {
        this.sdgTargetLis = response;
        this.sdgTargetLis.forEach(sdg => {
          sdg.sdgId = sdg.sdg.usnd_code;
          sdg.short_name = sdg.sdg.short_name;
          sdg.sdgList.map(
            item =>
              (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`)
          );
        });
      },
      error: err => {
        console.error(err);
      }
    });
  }

  removeOption(option) {
    const index = this.body.sdgTargets.findIndex(
      (valueItem: any) => valueItem.id == option.id
    );
    this.body.sdgTargets.splice(index, 1);
  }

  onSelectSDG(sdgItem) {
    this.sdgTargetLis.forEach(sdg => (sdg.selected = false));
    sdgItem.selected = true;
    this.currentsdgID = sdgItem.sdgId;
  }
}
