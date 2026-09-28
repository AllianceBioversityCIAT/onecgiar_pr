import { Component, EventEmitter, Input, Output } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideExternalLink, lucidePlus, lucideSearch } from '@ng-icons/lucide';
import { ApiService } from '../../../../../../../../../../../../shared/services/api/api.service';
import { COMPLEMENTARY_INNOVATION_COPY } from '../complementary-innovation.copy';

interface ComplementaryInnovation {
  climate_change_tag_level_id: string;
  created_date: string;
  description: string;
  gender_tag_level_id: string;
  initiative_id: number;
  initiative_name: string;
  initiative_official_code: string;
  initiative_short_name: string;
  lead_contact_person: string;
  result_code: string;
  result_id: string;
  result_level_name: string;
  result_type_id: number;
  result_type_name: string;
  title: string;
  selected: boolean;
}
@Component({
  selector: 'app-table-innovation',
  templateUrl: './table-innovation.component.html',
  styleUrls: ['./table-innovation.component.scss'],
  standalone: false,
  // P2-3840 — Lucide icons of the row actions and the search field (NgIcon comes from the module).
  providers: [provideIcons({ lucideCheck, lucideExternalLink, lucidePlus, lucideSearch })]
})
export class TableInnovationComponent {
  @Input() dataTable: any[] = [];
  @Input() columns: any[];
  @Output() selectEvent = new EventEmitter<ComplementaryInnovation>();
  @Output() editEvent = new EventEmitter<any>();
  @Output() cancelEvent = new EventEmitter<any>();

  readonly copy = COMPLEMENTARY_INNOVATION_COPY;
  searchText = '';
  columnOrder = [
    { title: 'Code', attr: 'result_code', width: '84px' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Lead', attr: 'initiative_official_code', width: '80px' },
    { title: 'Innovation Type', attr: 'result_type_name', width: '150px' },
    { title: 'Creation date', attr: 'created_date', width: '130px' }
  ];

  constructor(public api: ApiService) {}

  selectInnovation(result: ComplementaryInnovation) {
    result.selected = true;
    this.selectEvent.emit(result);
  }

  cancelInnovationEvent(result_id) {
    this.cancelEvent.emit(result_id);
  }

  openNewWindow(result) {
    const url = `/result/result-detail/${result.result_code}/general-information?phase=${result.version_id}`;
    window.open(url, '_blank');
  }

  onDelete(id, callback?) {
    this.api.alertsFe.show(
      {
        id: 'confirm-delete-result',
        title: `Are you sure you want to remove this complementary innovation?`,
        description: ``,
        status: 'success',
        confirmText: 'Yes, delete'
      },
      () => {
        this.api.resultsSE.DELETEcomplementaryinnovation(id).subscribe({
          next: () => {
            this.editEvent.emit(true);
          },
          error: err => {
            this.api.alertsFe.show({ id: 'delete-error', title: 'Error when delete result', description: '', status: 'error' });
            console.error(err);
          },
          complete: () => {
            callback?.();
          }
        });
      }
    );
  }
}
