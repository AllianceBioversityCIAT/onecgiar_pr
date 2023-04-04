import { Component, OnInit, Input } from '@angular/core';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-step-n1-sdg-targets',
  templateUrl: './step-n1-sdg-targets.component.html',
  styleUrls: ['./step-n1-sdg-targets.component.scss']
})
export class StepN1SdgTargetsComponent {
  @Input() body = new IpsrStep1Body();
  sdgTargetListSelector = [];
  sdgTargetListDropdowns = [];
  sdgTargetListExample = [];
  constructor(private api: ApiService) {}
  ngOnInit(): void {
    Array.from({ length: 17 }).map((_, i) => this.sdgTargetListSelector.push({ id: i + 1, selected: false }));
    this.GETAllClarisaSdgsTargets();
  }
  GETAllClarisaSdgsTargets() {
    this.api.resultsSE.GETAllClarisaSdgsTargets().subscribe(
      ({ response }) => {
        console.log(response);
        this.mapSdgTargetListDropdowns(response);
      },
      err => {
        console.log(err);
      }
    );
  }
  mapSdgTargetListDropdowns(objectList) {
    console.log(objectList);
    console.log(Object.keys(objectList));
    Object.keys(objectList).forEach(key => {
      this.sdgTargetListDropdowns.push({ list: objectList[key], key });
    });
    console.log(this.sdgTargetListDropdowns);
  }
  onSelectSDG(sdgItem) {
    this.sdgTargetListSelector.map(sdg => (sdg.selected = false));
    sdgItem.selected = true;
  }
}
