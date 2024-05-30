import { Component } from '@angular/core';
import { IpsrListFilterService } from '../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../services/ipsr-list.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
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
        const resultsListMapped = [];

        resultsListMapped.push({
          resul_code: 'Result code',
          phase_name: 'Reporting phase',
          reporting_year: 'Reporting year',
          result_title: 'Result title',
          result_type: 'Result type',
          core_innovation: 'Core innovation',
          link_core_innovation: 'Link - core innovation',
          geo_focus: 'Geofocus',
          submitted_by: 'Submitter',
          status: 'Status',
          gender_tag_level: 'Gender tag level',
          climate_change_tag_level: 'Climate change tag level',
          nutrition_tag_level: 'Nutrition tag level',
          environmental_biodiversity_tag_level: 'Environment AND/or biodiversity tag Level',
          poverty_tag_level: 'Poverty tag level',
          creation_date: 'Creation date',
          lead_initiative: 'Lead initiative',
          contributing_initiatives: 'Contributing initiative(s)',
          scaling_ambition: 'Scaling ambition',
          sdg_targets: 'Sustainable Development Goals (SDGs) targetted',
          scalability_potential_score_min: 'Scaling Readiness score',
          scalability_potential_score_avg: 'Scalability potential score',
          link_to_pdf: 'Link to IPSR metadata PDF report'
        });

        response.response.map(result => {
          resultsListMapped.push({
            resul_code: result.resul_code,
            phase_name: result.phase_name,
            reporting_year: result.reporting_year,
            result_title: result.result_title,
            result_type: result.result_type,
            core_innovation: result.core_innovation,
            link_core_innovation: result.link_core_innovation,
            geo_focus: result.geo_focus,
            submitted_by: result.submitted_by,
            status: result.status,
            gender_tag_level: result.gender_tag_level,
            climate_change_tag_level: result.climate_change_tag_level,
            nutrition_tag_level: result.nutrition_tag_level,
            environmental_biodiversity_tag_level: result.environmental_biodiversity_tag_level,
            poverty_tag_level: result.poverty_tag_level,
            creation_date: result.creation_date,
            lead_initiative: result.lead_initiative,
            contributing_initiatives: result.contributing_initiatives,
            scaling_ambition: result.scaling_ambition,
            sdg_targets: result.sdg_targets,
            scalability_potential_score_min: result.scalability_potential_score_min,
            scalability_potential_score_avg: result.scalability_potential_score_avg,
            link_to_pdf: result.link_to_pdf
          });
        });

        const wscols = [
          { wpx: 65 },
          { wpx: 86 },
          { wpx: 80 },
          { wpx: 700 },
          { wpx: 160 },
          { wpx: 300 },
          { wpx: 430 },
          { wpx: 300 },
          { wpx: 150 },
          { wpx: 65 },
          { wpx: 100 },
          { wpx: 100 },
          { wpx: 100 },
          { wpx: 100 },
          { wpx: 100 },
          { wpx: 75 },
          { wpx: 558 },
          { wpx: 161 },
          { wpx: 300 },
          { wpx: 300 },
          { wpx: 125 },
          { wpx: 135 },
          { wpx: 331 }
        ];

        this.exportTablesSE.exportExcel(resultsListMapped, 'IPSR_results_list', wscols, undefined, true);
        this.isLoadingReport = false;
      },
      error: err => {
        console.error(err);
        this.isLoadingReport = false;
      }
    });
  }
}
