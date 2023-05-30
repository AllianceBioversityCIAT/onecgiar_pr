import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-sdg-targets',
  templateUrl: './step-n1-sdg-targets.component.html',
  styleUrls: ['./step-n1-sdg-targets.component.scss']
})
export class StepN1SdgTargetsComponent {
  currentsdgID = null;
  @Input() body = new IpsrStep1Body();
  sdgTargetLis = [];
  constructor(private api: ApiService) {}
  ngOnInit(): void {
    this.GETAllClarisaSdgsTargets();
  }
  GETAllClarisaSdgsTargets() {
    this.api.resultsSE.GETAllClarisaSdgsTargets().subscribe(
      ({ response }) => {
        this.sdgTargetLis = response;
        this.sdgTargetLis.forEach(sdg => {
          //(sdg);
          sdg.sdgId = sdg.sdg.usnd_code;
          sdg.short_name = sdg.sdg.short_name;
          sdg.sdgList.map(item => (item.full_name = `<strong>${item.sdg_target_code}</strong> - ${item.sdg_target}`));
        });
        //(this.sdgTargetLis);

        // this.mapSdgTargetListDropdowns(response);
      },
      err => {
        console.log(err);
      }
    );
  }
  removeOption(option) {
    const index = this.body.sdgTargets.findIndex((valueItem: any) => valueItem.id == option.id);
    this.body.sdgTargets.splice(index, 1);
  }
  // mapSdgTargetListDropdowns(objectList) {
  //   console.log(objectList);
  //   console.log(Object.keys(objectList));
  //   Object.keys(objectList).forEach(key => {
  //     this.sdgTargetListDropdowns.push({ list: objectList[key], key });
  //   });
  //   console.log(this.sdgTargetListDropdowns);
  // }
  onSelectSDG(sdgItem) {
    this.sdgTargetLis.map(sdg => (sdg.selected = false));
    sdgItem.selected = true;
    this.currentsdgID = sdgItem.sdgId;
  }
}
