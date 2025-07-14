import { Component } from '@angular/core';
import { IpsrListFilterService } from '../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../services/ipsr-list.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
@Component({
    selector: 'app-ipsr-list-filters',
    templateUrl: './ipsr-list-filters.component.html',
    styleUrls: ['./ipsr-list-filters.component.scss'],
    standalone: false
})
export class IpsrListFiltersComponent {
  isLoadingReport = false;

  constructor(
    public api: ApiService,
    public ipsrListService: IpsrListService,
    public ipsrListFilterSE: IpsrListFilterService,
    public exportTablesSE: ExportTablesService,
    public ipsrDataControlSE: IpsrDataControlService
  ) {}

  onFilterSelectedInits() {
    if (this.ipsrListFilterSE.filters.general[0].options.every(init => !init.selected || init.cleanAll)) return [];

    return this.ipsrListFilterSE.filters.general[0].options.filter(opt => opt.selected);
  }

  onFilterSelectedPhases() {
    return this.ipsrListFilterSE.filters.general[1].options.filter(opt => opt.selected);
  }

  onDownLoadTableAsExcel(inits: any[], phases: any[], searchText: string | null) {
    this.isLoadingReport = true;

    this.api.resultsSE.GET_reportingList('2022-12-01', inits, phases, searchText).subscribe({
      next: ({ response }) => {
        const wscols = [
          { header: 'Result code', key: 'result_code', width: 13 },
          { header: 'Reporting phase', key: 'phase_name', width: 17.5 },
          { header: 'Reporting year', key: 'reporting_year', width: 16.5 },
          { header: 'Result title', key: 'result_title', width: 115.83 },
          { header: 'Result type', key: 'result_type', width: 21 },
          { header: 'Core innovation', key: 'core_innovation', width: 65.83 },
          { header: 'Link - core innovation', key: 'link_core_innovation', width: 75.33 },
          { header: 'Geofocus', key: 'geo_focus', width: 48.33 },
          { header: 'Submitter', key: 'submitted_by', width: 15.83 },
          { header: 'Status', key: 'status', width: 10 },
          { header: 'Gender tag level', key: 'gender_tag_level', width: 17.17 },
          { header: 'Climate change tag level', key: 'climate_change_tag_level', width: 25.17 },
          { header: 'Nutrition tag level', key: 'nutrition_tag_level', width: 19.17 },
          { header: 'Environment AND/or biodiversity tag Level', key: 'environmental_biodiversity_tag_level', width: 44.83 },
          { header: 'Poverty tag level', key: 'poverty_tag_level', width: 17.5 },
          { header: 'Creation date', key: 'creation_date', width: 14.33 },
          { header: 'Lead initiative', key: 'lead_initiative', width: 92.17 },
          { header: 'Contributing initiative(s)', key: 'contributing_initiatives', width: 32.5 },
          { header: 'Scaling ambition', key: 'scaling_ambition', width: 65.67 },
          { header: 'Sustainable Development Goals (SDGs) targetted', key: 'sdg_targets', width: 50.67 },
          { header: 'Scaling Readiness score', key: 'scalability_potential_score_min', width: 23.83 },
          { header: 'Scalability potential score', key: 'scalability_potential_score_avg', width: 26.33 },
          { header: 'Link to IPSR metadata PDF report', key: 'link_to_pdf', width: 59 }
        ];

        this.exportTablesSE.exportExcelIpsr(response.response, 'IPSR_results_list', wscols, undefined, true);
        this.isLoadingReport = false;
      },
      error: err => {
        console.error(err);
        this.isLoadingReport = false;
      }
    });
  }
}
