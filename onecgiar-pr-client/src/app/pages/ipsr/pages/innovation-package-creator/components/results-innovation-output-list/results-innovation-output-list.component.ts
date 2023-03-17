import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ManageInnovationsListService } from '../../../../services/manage-innovations-list.service';
interface CoreInnovationSelected {
  result_id: string;
  result_code: string;
  title: string;
  description: string;
  initiative_id: number;
  official_code: string;
  creation_date: string;
  innovation_type: string;
  selected: boolean;
}
@Component({
  selector: 'app-results-innovation-output-list',
  templateUrl: './results-innovation-output-list.component.html',
  styleUrls: ['./results-innovation-output-list.component.scss']
})
export class ResultsInnovationOutputListComponent {
  coreInnovationSelected: CoreInnovationSelected;
  searchText = '';
  @Output() selectInnovationEvent = new EventEmitter<CoreInnovationSelected>();
  constructor(public api: ApiService, public manageInnovationsListSE: ManageInnovationsListService) {}

  ngOnInit(): void {
    this.cleanSelected();
  }

  ngOnDestroy(): void {
    this.cleanSelected();
  }

  columnOrder = [
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Lead', attr: 'official_code' },
    { title: 'Creation date', attr: 'creation_date' }
  ];
  openInNewPage(link) {
    window.open(link, '_blank');
  }
  selectInnovation(result: CoreInnovationSelected) {
    this.cleanSelected();
    result.selected = true;
    this.selectInnovationEvent.emit(result);
  }

  cleanSelected() {
    this.manageInnovationsListSE.allInnovationsList.map((inno: CoreInnovationSelected) => (inno.selected = false));
  }
}
