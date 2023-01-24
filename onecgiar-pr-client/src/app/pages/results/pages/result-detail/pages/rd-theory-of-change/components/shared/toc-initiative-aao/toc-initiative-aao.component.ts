import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-toc-initiative-aao',
  templateUrl: './toc-initiative-aao.component.html',
  styleUrls: ['./toc-initiative-aao.component.scss']
})
export class TocInitiativeAaoComponent {
  @Input() readOnly: boolean;
  @Input() initiative: any;
  @Input() editable: boolean;
  value = true;
  actionAreasOutcomesList = [];
  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.GET_tocLevelsByresultId();
  }

  GET_tocLevelsByresultId() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.initiative.initiative_id, 4).subscribe(
      ({ response }) => {
        this.actionAreasOutcomesList = response;
        // console.log(response);
      },
      err => {
        console.log(err);
      }
    );
  }
}
