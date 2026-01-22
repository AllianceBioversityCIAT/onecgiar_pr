import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, effect, inject } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CurrentResult } from '../../../../../../shared/interfaces/current-result.interface';
import { ResultsListService } from './services/results-list.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { Table } from 'primeng/table';
import { ResultsNotificationsService } from '../results-notifications/results-notifications.service';
import { ResultsListFilterService } from './services/results-list-filter.service';
import { Router } from '@angular/router';
import { BilateralResultsService } from '../../../../../result-framework-reporting/pages/bilateral-results/bilateral-results.service';

interface ItemMenu {
  label: string;
  icon: string;
  visible?: boolean;
  command: () => void;
  tooltipText?: string;
  tooltipShow?: boolean;
  disabled?: boolean;
  inlineStyle?: string;
}

@Component({
  selector: 'app-results-list',
  templateUrl: './results-list.component.html',
  styleUrls: ['./results-list.component.scss', './results-list.responsive.scss'],
  standalone: false
})
export class ResultsListComponent implements OnInit, AfterViewInit, OnDestroy {
  router = inject(Router);
  bilateralResultsService = inject(BilateralResultsService);

  gettingReport = false;
  combine = true;

  columnOrder = [
    { title: 'Result code', attr: 'result_code', center: true, width: '95px' },
    { title: 'Title', attr: 'title', class: 'notCenter', width: '305px' },
    { title: 'Funding Source', attr: 'source_name', class: 'notCenter', width: '105px' },
    { title: 'Phase - Portfolio', attr: 'phase_name', width: '155px' },
    { title: 'Indicator category', attr: 'result_type', width: '150px' },
    { title: 'Submitter', attr: 'submitter', center: true, width: '60px' },
    { title: 'Status', attr: 'full_status_name_html', center: true, width: '124px' },
    { title: 'Creation date	', attr: 'created_date', center: true, width: '120px' },
    { title: 'Created by	', attr: 'full_name', width: '120px' }
  ];
  items: ItemMenu[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-sitemap',
      visible: true,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    },
    {
      label: 'Update result',
      icon: 'pi pi-clone',
      visible: true,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.api.dataControlSE.chagePhaseModal = true;
      }
    },
    {
      label: 'Review result',
      icon: 'pi pi-eye',
      inlineStyle: 'color: var(--pr-color-primary-300);',
      visible: false,
      command: () => {
        this.navigateToResult(this.api.dataControlSE.currentResult);
      }
    }
  ];
  itemsWithDelete: ItemMenu[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-sitemap',
      visible: true,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.api.dataControlSE.showShareRequest = true;
      }
    },
    {
      label: 'Update result',
      icon: 'pi pi-clone',
      visible: true,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.api.dataControlSE.chagePhaseModal = true;
      }
    },
    {
      label: 'Review result',
      icon: 'pi pi-pencil',
      visible: false,
      inlineStyle: 'color: var(--pr-color-primary-300);',
      command: () => {
        this.navigateToResult(this.api.dataControlSE.currentResult);
      }
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      inlineStyle: 'color: var(--pr-color-red-300);',
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
    private ResultLevelSE: ResultLevelService,
    private shareRequestModalSE: ShareRequestModalService,
    private retrieveModalSE: RetrieveModalService,
    public phasesService: PhasesService,
    public resultsListFilterSE: ResultsListFilterService
  ) {
    effect(() => {
      this.resultsListFilterSE.text_to_search();
      this.resultsListFilterSE.selectedPhases();
      this.resultsListFilterSE.selectedSubmittersAdmin();
      this.resultsListFilterSE.selectedIndicatorCategories();
      this.resultsListFilterSE.selectedStatus();

      if (this.table) {
        this.resetTable();
        this.applyDefaultSort();
      }
    });
  }

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

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.resetTable();
      this.applyDefaultSort();
    }, 500);
  }

  private resetTable(): void {
    if (this.table) {
      this.table.reset();
    }
  }

  public resetTableManually(): void {
    this.resetTable();
  }

  private applyDefaultSort(): void {
    if (!this.table) return;

    this.table.sortField = 'result_code';
    this.table.sortOrder = -1;

    if (typeof this.table.sortSingle === 'function') {
      this.table.sortSingle();
    } else if (typeof this.table.sort === 'function') {
      this.table.sort({ field: 'result_code', order: -1 });
    }
  }

  unSelectInits() {
    this.api.dataControlSE.myInitiativesList.forEach(item => (item.selected = false));
  }

  onPressAction(result: CurrentResult): void {
    this.retrieveModalSE.title = result?.title ?? '';
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;

    const canUpdate = this.api.shouldShowUpdate(result, this.api.dataControlSE.reportingCurrentPhase);

    if (result?.source_name == 'W3/Bilaterals') {
      this.itemsWithDelete[0].visible = false;
      this.itemsWithDelete[1].visible = false;
      this.items[0].visible = false;
      this.items[1].visible = false;

      this.itemsWithDelete[2].visible = true;
      this.itemsWithDelete[2].label = result?.status_name == 'Pending Review' ? 'Review result' : 'See result';
      this.itemsWithDelete[2].icon = result?.status_name == 'Pending Review' ? 'pi pi-pencil' : 'pi pi-eye';

      this.items[2].visible = true;
      this.items[2].label = result?.status_name == 'Pending Review' ? 'Review result' : 'See result';
      this.items[2].icon = result?.status_name == 'Pending Review' ? 'pi pi-pencil' : 'pi pi-eye';
    } else {
      this.itemsWithDelete[0].visible = true;
      this.itemsWithDelete[2].visible = false;
      this.items[0].visible = true;
      this.items[1].visible = canUpdate;
      this.items[2].visible = false;
      this.itemsWithDelete[1].visible =
        this.api.dataControlSE.reportingCurrentPhase.portfolioAcronym === 'P25'
          ? canUpdate
          : this.api.dataControlSE.currentResult?.phase_year < this.api.dataControlSE.reportingCurrentPhase.phaseYear &&
            this.api.dataControlSE.currentResult?.phase_year !== this.api.dataControlSE.reportingCurrentPhase.phaseYear;
    }

    if (this.api.rolesSE.isAdmin) {
      this.itemsWithDelete[3] = {
        ...this.itemsWithDelete[3],
        disabled: this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipShow: this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipText: 'You are not allowed to perform this action because the result is in the status "QAed".'
      };
    } else {
      this.itemsWithDelete[3] = {
        ...this.itemsWithDelete[3],
        disabled:
          (this.api.dataControlSE.currentResult?.role_id !== 3 &&
            this.api.dataControlSE.currentResult?.role_id !== 4 &&
            this.api.dataControlSE.currentResult?.role_id !== 5) ||
          this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipShow:
          (this.api.dataControlSE.currentResult?.role_id !== 3 &&
            this.api.dataControlSE.currentResult?.role_id !== 4 &&
            this.api.dataControlSE.currentResult?.role_id !== 5) ||
          this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipText: this.getDeleteTooltipText()
      };
    }

    if (this.api.dataControlSE.reportingCurrentPhase.portfolioAcronym == this.api.dataControlSE.currentResult?.acronym) {
      this.itemsWithDelete[3].visible = true;
    } else {
      this.itemsWithDelete[3].visible = false;
    }
  }

  private getDeleteTooltipText(): string {
    if (this.api.dataControlSE.currentResult?.status_id == '2') {
      return 'You are not allowed to perform this action because the result is in the status "QAed".';
    }

    if (
      this.api.dataControlSE.currentResult?.role_id !== 3 &&
      this.api.dataControlSE.currentResult?.role_id !== 4 &&
      this.api.dataControlSE.currentResult?.role_id !== 5
    ) {
      return 'You are not allowed to perform this action. Please contact your leader or co-leader.';
    }

    return '';
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

  navigateToResult(result: CurrentResult) {
    if (result?.source_name == 'W3/Bilaterals') {
      const url = '/result-framework-reporting/entity-details/' + result.submitter + '/results-review';
      this.bilateralResultsService.currentResultToReview.set(result);

      this.router.navigateByUrl(url).then(() => {
        this.bilateralResultsService.showReviewDrawer.set(true);
      });
    } else {
      const url = '/result/result-detail/' + result.result_code + '/general-information?phase=' + result.version_id;

      this.router.navigateByUrl(url);
    }
  }

  ngOnDestroy(): void {
    this.api.dataControlSE?.myInitiativesList.map(item => (item.selected = true));
  }
}
