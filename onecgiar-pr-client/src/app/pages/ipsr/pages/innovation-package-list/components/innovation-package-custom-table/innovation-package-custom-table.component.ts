import { Component, Input } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-innovation-package-custom-table',
  templateUrl: './innovation-package-custom-table.component.html',
  styleUrls: ['./innovation-package-custom-table.component.scss']
})
export class InnovationPackageCustomTableComponent {
  @Input() tableData: any;
  columnOrder = [
    { title: 'ID', attr: 'id' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Submitter', attr: 'submitter' },
    { title: 'Status', attr: 'status_name' },
    { title: 'Year', attr: 'year' }
  ];
  constructor(public api: ApiService) {}
}
