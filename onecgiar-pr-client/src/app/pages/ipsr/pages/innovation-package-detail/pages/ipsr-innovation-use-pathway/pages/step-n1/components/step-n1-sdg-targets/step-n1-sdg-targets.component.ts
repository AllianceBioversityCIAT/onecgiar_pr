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
  sdgTargetLisSelected = [];
  @Input() body = new IpsrStep1Body();
  sdgTargetLis = [];
  constructor(private api: ApiService) {}
  ngOnInit(): void {
    this.GETAllClarisaSdgsTargets();
  }
  GETAllClarisaSdgsTargets() {
    this.api.resultsSE.GETAllClarisaSdgsTargets().subscribe(
      ({ response }) => {
        console.log(response);
        this.sdgTargetLis = response;
        // this.mapSdgTargetListDropdowns(response);
      },
      err => {
        console.log(err);
      }
    );
  }
  removeOption(option) {}
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
