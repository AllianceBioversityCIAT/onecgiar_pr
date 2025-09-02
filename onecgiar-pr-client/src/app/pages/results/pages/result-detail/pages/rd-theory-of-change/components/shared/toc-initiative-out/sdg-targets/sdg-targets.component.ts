import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-sdg-targets',
    templateUrl: './sdg-targets.component.html',
    styleUrls: ['./sdg-targets.component.scss'],
    standalone: false
})
export class SdgTargetsComponent implements OnInit {
  currentsdgID = null;
  @Input() body = [];
  @Input() sdgRequid = false;
  sdgTargetLis = [];

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.GETAllClarisaSdgsTargets();
  }

  dropDownPlaceHolder(name: string) {
    return `Select ${name} target(s)`;
  }

  GETAllClarisaSdgsTargets() {
    this.api.resultsSE.GETAllClarisaSdgsTargets().subscribe({
      next: ({ response }) => {
        this.sdgTargetLis = response;
        this.sdgTargetLis.forEach(sdg => {
          sdg.sdgId = sdg.sdg.usnd_code;
          sdg.short_name = sdg.sdg.short_name;
          sdg.sdgList.forEach(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));
        });
      },
      error: err => {
        console.error(err);
      }
    });
  }

  removeOption(option) {
    const index = this.body.findIndex((valueItem: any) => valueItem.id === option.id);
    this.body.splice(index, 1);
  }

  onSelectSDG(sdgItem) {
    this.sdgTargetLis.forEach(sdg => (sdg.selected = false));
    sdgItem.selected = true;
    this.currentsdgID = sdgItem.sdgId;
  }
}
