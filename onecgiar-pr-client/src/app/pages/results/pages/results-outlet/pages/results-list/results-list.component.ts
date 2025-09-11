import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { CurrentResult } from '../../../../../../shared/interfaces/current-result.interface';
import { ResultsListService } from './services/results-list.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
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
import { ResultsListFilterService } from './services/results-list-filter.service';

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

    const canUpdate = this.api.shouldShowUpdate(result, this.api.dataControlSE.reportingCurrentPhase);
    this.items[1].visible = canUpdate;
    this.itemsWithDelete[1].visible =
      this.api.dataControlSE.reportingCurrentPhase.portfolioAcronym !== 'P25'
        ? this.api.dataControlSE.currentResult?.phase_year < this.api.dataControlSE.reportingCurrentPhase.phaseYear &&
          this.api.dataControlSE.currentResult?.phase_year !== this.api.dataControlSE.reportingCurrentPhase.phaseYear
        : canUpdate;

    if (!this.api.rolesSE.isAdmin) {
      this.itemsWithDelete[2] = {
        ...this.itemsWithDelete[2],
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
    } else {
      this.itemsWithDelete[2] = {
        ...this.itemsWithDelete[2],
        disabled: this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipShow: this.api.dataControlSE.currentResult?.status_id == '2',
        tooltipText: 'You are not allowed to perform this action because the result is in the status "QAed".'
      };
    }

    if (this.api.dataControlSE.reportingCurrentPhase.portfolioAcronym == this.api.dataControlSE.currentResult?.acronym) {
      this.itemsWithDelete[2].visible = true;
    } else {
      this.itemsWithDelete[2].visible = false;
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

  ngOnDestroy(): void {
    this.api.dataControlSE?.myInitiativesList.map(item => (item.selected = true));
  }
}
