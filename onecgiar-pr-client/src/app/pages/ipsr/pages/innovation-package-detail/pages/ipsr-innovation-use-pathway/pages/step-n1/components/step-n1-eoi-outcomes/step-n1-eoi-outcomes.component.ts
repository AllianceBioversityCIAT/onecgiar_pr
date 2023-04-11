import { Component, OnInit, Input } from '@angular/core';
import { TocApiService } from '../../../../../../../../../../shared/services/api/toc-api.service';
import { IpsrDataControlService } from '../../../../../../../../services/ipsr-data-control.service';
import { IpsrStep1Body } from '../../model/Ipsr-step-1-body.model';

@Component({
  selector: 'app-step-n1-eoi-outcomes',
  templateUrl: './step-n1-eoi-outcomes.component.html',
  styleUrls: ['./step-n1-eoi-outcomes.component.scss']
})
export class StepN1EoiOutcomesComponent {
  @Input() body = new IpsrStep1Body();
  eoiList = [];
  constructor(private tocApiSE: TocApiService, private ipsrDataControlSE: IpsrDataControlService) {}
  ngOnInit(): void {
    this.GET_EOIList();
  }

  GET_EOIList() {
    // console.log(this.ipsrDataControlSE?.detailData?.inititiative_id);
    this.tocApiSE.GET_tocLevelsByresultId(this.ipsrDataControlSE?.detailData?.inititiative_id, 3).subscribe(
      ({ response }) => {
        // console.log(response);
        this.eoiList = response;
      },
      err => {
        console.log(err);
      }
    );
  }
}
