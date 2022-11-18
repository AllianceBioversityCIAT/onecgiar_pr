import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-toc-action-area-outcome-section',
  templateUrl: './toc-action-area-outcome-section.component.html',
  styleUrls: ['./toc-action-area-outcome-section.component.scss']
})
export class TocActionAreaOutcomeSectionComponent {
  constructor(public api: ApiService) {}
  actionAreasOutcomesList = [];
  ngOnInit(): void {
    this.GET_tocLevelsByresultId();
  }

  value;
  lista = [{ name: 'Resilient Agrifood Systems - </strong>NARES and Regional Agricultural Research Institutes develop farming system innovations with the potential to increase the food security of smallholders in targeted areas. ' }];
  listb = [{ name: 'Resilient Agrifood Systems - </strong>NARES and Regional Agricultural Research Institutes develop farming system innovations with the potential to increase the food security of smallholders in targeted areas. ' }];
  GET_tocLevelsByresultId() {
    this.api.tocApiSE.GET_tocLevelsByresultId(this.api.resultsSE.currentResultId, 4).subscribe(
      ({ response }) => {
        this.actionAreasOutcomesList = response;
        console.log(response);
      },
      err => {
        console.log(err);
      }
    );
  }
}
