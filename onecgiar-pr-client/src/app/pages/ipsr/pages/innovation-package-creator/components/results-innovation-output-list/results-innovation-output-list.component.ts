import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  OnDestroy
} from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ManageInnovationsListService } from '../../../../services/manage-innovations-list.service';
import { InnovationPackageCreatorBody } from '../../model/innovation-package-creator.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { FilterByTextPipe } from '../../../../../../shared/pipes/filter-by-text.pipe';
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
  standalone: true,
  templateUrl: './results-innovation-output-list.component.html',
  styleUrls: ['./results-innovation-output-list.component.scss'],
  imports: [CommonModule, FormsModule, TableModule, FilterByTextPipe]
})
export class ResultsInnovationOutputListComponent implements OnInit, OnDestroy {
  coreInnovationSelected: CoreInnovationSelected;
  searchText = '';
  @Input() body = new InnovationPackageCreatorBody();
  @Output() selectInnovationEvent = new EventEmitter<CoreInnovationSelected>();

  constructor(
    public api: ApiService,
    public manageInnovationsListSE: ManageInnovationsListService
  ) {}

  ngOnInit(): void {
    this.cleanSelected();
    this.manageInnovationsListSE.GETallInnovations(this.body.initiative_id);
  }

  ngOnDestroy(): void {
    this.cleanSelected();
  }

  columnOrder = [
    { title: 'Result code', attr: 'result_code' },
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
    this.manageInnovationsListSE.allInnovationsList.map(
      (inno: CoreInnovationSelected) => (inno.selected = false)
    );
  }
}
