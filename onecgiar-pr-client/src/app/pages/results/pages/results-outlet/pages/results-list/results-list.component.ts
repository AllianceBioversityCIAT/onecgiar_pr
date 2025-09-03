import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CurrentResult } from '../../../../../../shared/interfaces/current-result.interface';
import { ResultsListService } from './services/results-list.service';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { Table } from 'primeng/table';
import { ResultsNotificationsService } from '../results-notifications/results-notifications.service';

interface ItemMenu {
  label: string;
  icon: string;
  visible?: boolean;
  command: () => void;
  tooltipText?: string;
  tooltipShow?: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-results-list',
  templateUrl: './results-list.component.html',
  styleUrls: ['./results-list.component.scss', './results-list.responsive.scss'],
  standalone: false
})
export class ResultsListComponent implements OnInit, OnDestroy {
  gettingReport = false;
  combine = true;

  columnOrder = [
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Phase - Portfolio', attr: 'phase_name' },
    { title: 'Indicator category', attr: 'result_type' },
    { title: 'Submitter', attr: 'submitter', center: true },
    { title: 'Status', attr: 'full_status_name_html', center: true },
    { title: 'Creation date	', attr: 'created_date' },
    { title: 'Created by	', attr: 'full_name' }
  ];
  items: ItemMenu[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      visible: true,
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    },
    {
      label: 'Update result',
      icon: 'pi pi-fw pi-clone',
      visible: true,
      command: () => {
        this.api.dataControlSE.chagePhaseModal = true;
      }
    }
  ];
  itemsWithDelete: ItemMenu[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      visible: true,
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    },
    {
      label: 'Update result',
      icon: 'pi pi-fw pi-clone',
      visible: true,
      command: () => {
        this.api.dataControlSE.chagePhaseModal = true;
      }
    },
    {
      label: 'Delete',
      icon: 'pi pi-fw pi-trash',
      tooltipText: 'You are not allowed to perform this action. Please contact your leader or co-leader.',
      tooltipShow: false,
      disabled: false,
      command: () => {
        this.onDeleteREsult();
      }
    }
  ];

  @ViewChild('table') table: Table;

  constructor(
    public resultsNotificationsSE: ResultsNotificationsService,
    public api: ApiService,
    public resultsListService: ResultsListService,
    private exportTablesSE: ExportTablesService,
    private shareRequestModalSE: ShareRequestModalService,
    private retrieveModalSE: RetrieveModalService,
    public phasesService: PhasesService
  ) {}

  validateOrder(columnAttr) {
    setTimeout(() => {
      if (columnAttr == 'result_code') {
        this.combine = true;
        return;
      }
      const resultListTableHTML = document.getElementById('resultListTable');
      this.combine =
        !resultListTableHTML.querySelectorAll('th[aria-sort="descending"]').length &&
        !resultListTableHTML.querySelectorAll('th[aria-sort="ascending"]').length;
      return null;
    }, 100);
  }

  ngOnInit(): void {
    if (this.api.rolesSE.isAdmin) {
      this.unSelectInits();
    } else {
      this.api.updateUserData(() => {});
    }
    this.api.updateResultsList();
    this.shareRequestModalSE.inNotifications = false;
    this.api.dataControlSE.getCurrentPhases();
  }

  unSelectInits() {
    this.api.dataControlSE.myInitiativesList.forEach(item => (item.selected = false));
  }

  onPressAction(result: CurrentResult): void {
    this.retrieveModalSE.title = result?.title ?? '';
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;

    const canUpdate = this.shouldShowUpdate(result);
    this.items[1].visible = this.api.dataControlSE.reportingCurrentPhase.portfolioAcronym !== 'P25' ? false : canUpdate;
    this.itemsWithDelete[1].visible =
      this.api.dataControlSE.reportingCurrentPhase.portfolioAcronym !== 'P25'
        ? this.api.dataControlSE.currentResult?.phase_year < this.api.dataControlSE.reportingCurrentPhase.phaseYear &&
          this.api.dataControlSE.currentResult?.phase_year !== this.api.dataControlSE.reportingCurrentPhase.phaseYear
        : canUpdate;

    if (!this.api.rolesSE.isAdmin) {
      this.itemsWithDelete[2] = {
        ...this.itemsWithDelete[2],
        disabled:
          this.api.dataControlSE.currentResult?.role_id !== 3 &&
          this.api.dataControlSE.currentResult?.role_id !== 4 &&
          this.api.dataControlSE.currentResult?.role_id !== 5,
        tooltipShow:
          this.api.dataControlSE.currentResult?.role_id !== 3 &&
          this.api.dataControlSE.currentResult?.role_id !== 4 &&
          this.api.dataControlSE.currentResult?.role_id !== 5
      };
    }

    if (this.api.dataControlSE.reportingCurrentPhase.portfolioAcronym == this.api.dataControlSE.currentResult?.acronym) {
      this.itemsWithDelete[2].visible = true;
    } else {
      this.itemsWithDelete[2].visible = false;
    }
  }

  private shouldShowUpdate(result: CurrentResult): boolean {
    const initiativeMap = Array.isArray(result?.initiative_entity_map) ? result.initiative_entity_map : [];
    const hasInitiatives = initiativeMap.length > 0;
    const isPastPhase = this.isPastReportingPhase(result);

    if (this.api.rolesSE.isAdmin) {
      return hasInitiatives && isPastPhase;
    }

    return this.isUserIncludedInAnyInitiative(result) && isPastPhase;
  }

  private isPastReportingPhase(result: CurrentResult): boolean {
    const phaseYear = this.api.dataControlSE.reportingCurrentPhase?.phaseYear;
    return typeof result?.phase_year === 'number' && typeof phaseYear === 'number' && result.phase_year < phaseYear;
  }

  private isUserIncludedInAnyInitiative(result: CurrentResult): boolean {
    const mapIds = this.getInitiativeIdsFromMap(result);
    const userInitiativeIds = this.getUserInitiativeIds(result);
    return mapIds.some(entityId => userInitiativeIds.includes(entityId));
  }

  private getInitiativeIdsFromMap(result: CurrentResult): Array<string | number> {
    const mapArray = Array.isArray(result?.initiative_entity_map) ? result.initiative_entity_map : [];
    return mapArray.map((item: any) => item?.entityId).filter((id: unknown): id is string | number => id !== undefined && id !== null);
  }

  private getUserInitiativeIds(result: CurrentResult): Array<string | number> {
    const userArray = Array.isArray(result?.initiative_entity_user) ? result.initiative_entity_user : [];
    return userArray.map((item: any) => item?.initiative_id).filter((id: unknown): id is string | number => id !== undefined && id !== null);
  }

  onDownLoadTableAsExcel() {
    this.gettingReport = true;
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
        this.gettingReport = false;
      },
      error: err => {
        console.error(err);
        this.gettingReport = false;
      }
    });
  }

  onDeleteREsult() {
    this.api.alertsFe.show(
      {
        id: 'confirm-delete-result',
        title: `Are you sure you want to delete the result "${this.api.dataControlSE?.currentResult?.title}"?`,
        description: `If you delete this result it will no longer be displayed in the list of results.`,
        status: 'success',
        confirmText: 'Yes, delete'
      },
      () => {
        this.resultsListService.showDeletingResultSpinner = true;
        setTimeout(() => {
          document.getElementById('custom-spinner').scrollIntoView({ behavior: 'smooth' });
        }, 100);
        this.api.resultsSE.PATCH_DeleteResult(this.api.dataControlSE.currentResult.id).subscribe({
          next: resp => {
            this.api.alertsFe.show({
              id: 'confirm-delete-result-su',
              title: `The result "${this.api.dataControlSE?.currentResult?.title}" was deleted`,
              description: ``,
              status: 'success'
            });
            this.api.updateResultsList();
            this.resultsListService.showDeletingResultSpinner = false;
          },
          error: err => {
            console.error(err);
            this.api.alertsFe.show({ id: 'delete-error', title: 'Error when delete result', description: '', status: 'error' });
            this.resultsListService.showDeletingResultSpinner = false;
          }
        });
      }
    );
  }

  ngOnDestroy(): void {
    this.api.dataControlSE?.myInitiativesList.map(item => (item.selected = true));
  }
}
