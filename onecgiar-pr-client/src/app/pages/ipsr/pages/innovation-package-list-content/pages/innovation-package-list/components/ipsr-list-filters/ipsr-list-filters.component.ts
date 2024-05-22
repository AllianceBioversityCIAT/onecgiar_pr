import { Component } from '@angular/core';
import { IpsrListFilterService } from '../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../services/ipsr-list.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
@Component({
  selector: 'app-ipsr-list-filters',
  templateUrl: './ipsr-list-filters.component.html',
  styleUrls: ['./ipsr-list-filters.component.scss']
})
export class IpsrListFiltersComponent {
  isLoadingReport = false;

  constructor(
    public api: ApiService,
    public ipsrListService: IpsrListService,
    public ipsrListFilterSE: IpsrListFilterService,
    public exportTablesSE: ExportTablesService
  ) {}

  onFilterSelectedInits() {
    if (this.ipsrListFilterSE.filters.general[0].options.every(init => !init.selected || init.cleanAll)) return [];

    return this.ipsrListFilterSE.filters.general[0].options.filter(opt => opt.selected);
  }

  onFilterSelectedPhases() {
    return this.ipsrListFilterSE.filters.general[1].options.filter(opt => opt.selected);
  }

  onDownLoadTableAsExcel(inits: any[] = [], phases: any[] = [], searchText: string | null = null) {
    this.isLoadingReport = true;

    this.api.resultsSE.GET_reportingList('2022-12-01', inits, phases, searchText).subscribe({
      next: ({ response }) => {
        this.exportTablesSE.exportExcel(response.response, 'IPSR_results_list');
        this.isLoadingReport = false;
      },
      error: err => {
        console.error(err);
        this.isLoadingReport = false;
      }
    });
  }
}
