import { Component, OnInit, computed, signal, Input, SimpleChanges, OnChanges } from '@angular/core';
import { ResultsListFilterService } from '../../services/results-list-filter.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CustomFieldsModule } from '../../../../../../../../custom-fields/custom-fields.module';
import { MultiSelectModule } from 'primeng/multiselect';
import { DrawerModule } from 'primeng/drawer';
import { ModuleTypeEnum, StatusPhaseEnum } from '../../../../../../../../shared/enum/api.enum';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { BadgeModule } from 'primeng/badge';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
@Component({
  selector: 'app-results-list-filters',
  templateUrl: './results-list-filters.component.html',
  styleUrls: ['./results-list-filters.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MultiSelectModule,
    CustomFieldsModule,
    DrawerModule,
    OverlayBadgeModule,
    BadgeModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ButtonModule
  ]
})
export class ResultsListFiltersComponent implements OnInit, OnChanges {
  gettingReport = signal(false);
  visible = signal(false);
  filtersCount = computed(() => {
    let count = 0;

    if (this.resultsListFilterSE.selectedPhases().length > 0) count++;
    if (this.isAdmin && this.resultsListFilterSE.selectedSubmittersAdmin().length > 0) count++;
    if (!this.isAdmin && this.resultsListFilterSE.selectedSubmitters().length > 0) count++;
    if (this.resultsListFilterSE.selectedIndicatorCategories().length > 0) count++;
    if (this.resultsListFilterSE.selectedStatus().length > 0) count++;
    if (this.resultsListFilterSE.text_to_search().length > 0) count++;

    return count;
  });
  filtersCountText = computed(() => {
    if (this.filtersCount() === 0) return 'Apply filters';
    return `Apply filters (${this.filtersCount()})`;
  });
  @Input() isAdmin = false;

  constructor(
    public resultsListFilterSE: ResultsListFilterService,
    public api: ApiService,
    private exportTablesSE: ExportTablesService
  ) {}

  ngOnInit(): void {
    this.getData();
    this.getResultStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isAdmin']) {
      this.getAllInitiatives();
    }
  }

  getAllInitiatives() {
    if (!this.isAdmin) return;

    this.api.resultsSE.GET_AllInitiatives().subscribe({
      next: ({ response }) => {
        this.resultsListFilterSE.submittersOptionsAdminOld.set(response);
      },
      error: err => {
        console.error(err);
      }
    });
  }

  getData() {
    this.api.dataControlSE
      .getCurrentPhases()
      .pipe(switchMap(() => this.api.resultsSE.GET_versioning(StatusPhaseEnum.ALL, ModuleTypeEnum.REPORTING)))
      .subscribe({
        next: ({ response }) => this.handleVersioningResponse(response)
      });
  }

  private handleVersioningResponse(response: any[]) {
    this.resultsListFilterSE.phasesOptions.set(this.buildPhaseOptions(response));
    this.resultsListFilterSE.phasesOptionsOld.set(this.resultsListFilterSE.phasesOptions());

    this.resultsListFilterSE.selectedPhases.set(
      this.resultsListFilterSE.phasesOptions().filter(item => this.api.dataControlSE?.reportingCurrentPhase?.portfolioId == item.portfolio_id)
    );

    this.resultsListFilterSE.submittersOptions.set(this.filterOptionsBySelectedPhases(this.resultsListFilterSE.submittersOptionsOld()));
    this.resultsListFilterSE.submittersOptionsAdmin.set(this.filterOptionsBySelectedPhases(this.resultsListFilterSE.submittersOptionsAdminOld()));

    this.resultsListFilterSE.selectedSubmitters.set(this.filterOptionsBySelectedPhases(this.resultsListFilterSE.submittersOptions()));
    this.resultsListFilterSE.selectedSubmittersAdmin.set(this.filterOptionsBySelectedPhases(this.resultsListFilterSE.submittersOptionsAdmin()));
  }

  private buildPhaseOptions(response: any[]) {
    return response.map(item => ({
      ...item,
      selected: item.status,
      name: item.phase_name + (item.status ? ' (Open)' : ' (Closed)'),
      attr: item.phase_name + (item.obj_portfolio?.acronym ? ' - ' + item.obj_portfolio.acronym : '')
    }));
  }

  private filterOptionsBySelectedPhases<T extends { portfolio_id: any }>(options: T[]): T[] {
    const selected = this.resultsListFilterSE.selectedPhases();
    return options.filter(item => selected.some(phase => phase.portfolio_id == item.portfolio_id));
  }

  clearAllNewFilters() {
    this.resultsListFilterSE.selectedPhases.set([]);

    // Update available submitter options based on the reset phases
    this.resultsListFilterSE.submittersOptions.set(this.filterOptionsBySelectedPhases(this.resultsListFilterSE.submittersOptionsOld()));
    this.resultsListFilterSE.submittersOptionsAdmin.set(this.filterOptionsBySelectedPhases(this.resultsListFilterSE.submittersOptionsAdminOld()));

    // Set selected submitters to match the filtered options
    this.resultsListFilterSE.selectedSubmitters.set([]);
    this.resultsListFilterSE.selectedSubmittersAdmin.set([]);

    this.resultsListFilterSE.selectedIndicatorCategories.set([]);
    this.resultsListFilterSE.selectedStatus.set([]);
    this.resultsListFilterSE.text_to_search.set('');
  }

  getResultStatus() {
    this.api.resultsSE.GET_allResultStatuses().subscribe(({ response }) => {
      this.resultsListFilterSE.statusOptions.set(response);
    });
  }

  onSelectPhases() {
    this.resultsListFilterSE.selectedSubmitters.set([]);
    this.resultsListFilterSE.selectedSubmittersAdmin.set([]);

    this.resultsListFilterSE.submittersOptionsAdmin.set(
      this.resultsListFilterSE
        .submittersOptionsAdminOld()
        .filter(item => this.resultsListFilterSE.selectedPhases().some(phase => phase.portfolio_id == item.portfolio_id))
    );

    this.resultsListFilterSE.submittersOptions.set(
      this.resultsListFilterSE
        .submittersOptionsOld()
        .filter(item => this.resultsListFilterSE.selectedPhases().some(phase => phase.portfolio_id == item.portfolio_id))
    );
  }

  onDownLoadTableAsExcel() {
    this.gettingReport.set(true);
    this.api.resultsSE.GET_reportingList().subscribe({
      next: ({ response }) => {
        const wscols = [
          { header: 'Result code', key: 'result_code', width: 13 },
          { header: 'Reporting phase', key: 'phase_name', width: 17.5 },
          { header: 'Reporting year', key: 'reported_year_id', width: 13 },
          { header: 'Result title', key: 'title', width: 125 },
          { header: 'Description', key: 'description', width: 125 },
          { header: 'Result type', key: 'result_type', width: 45 },
          { header: 'Is Key Result Story', key: 'is_key_result', width: 45 },
          { header: 'Gender tag level', key: 'gender_tag_level', width: 20 },
          { header: 'Climate tag level', key: 'climate_tag_level', width: 20 },
          { header: 'Nutrition tag level', key: 'nutrition_tag_level', width: 20 },
          { header: 'Environment/biodiversity tag level', key: 'environment_tag_level', width: 38 },
          { header: 'Poverty tag level', key: 'poverty_tag_level', width: 20 },
          { header: 'Submitter', key: 'official_code', width: 14 },
          { header: 'Status', key: 'status_name', width: 17 },
          { header: 'Creation date', key: 'creation_date', width: 15 },
          { header: 'Work package id', key: 'work_package_id', width: 18 },
          { header: 'Work package title', key: 'work_package_title', width: 125 },
          { header: 'ToC result id', key: 'toc_result_id', width: 15 },
          { header: 'ToC result title', key: 'toc_result_title', width: 125 },
          { header: 'Action Area(s)', key: 'action_areas', width: 53 },
          { header: 'Center(s)', key: 'centers', width: 80 },
          { header: 'Contributing Initiative(s)', key: 'contributing_initiative', width: 26 },
          { header: 'PDF Link', key: 'pdf_link', width: 65 }
        ];

        this.exportTablesSE.exportExcel(response, 'results_list', wscols, [
          {
            cellNumber: 23,
            cellKey: 'pdf_link'
          }
        ]);
        this.gettingReport.set(false);
      },
      error: err => {
        console.error(err);
        this.gettingReport.set(false);
      }
    });
  }
}
