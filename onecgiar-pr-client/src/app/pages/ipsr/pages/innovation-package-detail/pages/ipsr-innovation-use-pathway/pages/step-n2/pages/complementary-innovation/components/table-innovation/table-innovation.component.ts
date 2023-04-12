import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { ManageInnovationsListService } from '../../../../../../../../../../services/manage-innovations-list.service';

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
  selector: 'app-table-innovation',
  templateUrl: './table-innovation.component.html',
  styleUrls: ['./table-innovation.component.scss']
})
export class TableInnovationComponent implements OnInit {

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
    { title: 'Title', attr: 'result_code' },
    { title: 'Lead', attr: 'title', class: 'notCenter' },
    { title: 'is QAed', attr: 'official_code' },
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
