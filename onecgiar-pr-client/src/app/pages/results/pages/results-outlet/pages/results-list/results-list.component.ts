import { Component, OnInit, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultsListService } from './services/results-list.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { ExportTablesService } from '../../../../../../shared/services/export-tables.service';
import { ShareRequestModalService } from '../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-results-list',
  templateUrl: './results-list.component.html',
  styleUrls: ['./results-list.component.scss', './results-list.responsive.scss']
})
export class ResultsListComponent implements OnInit {
  gettingReport = false;
  combine = true;
  columnOrder = [
    // { title: 'Result code', attr: 'result_code' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Phase', attr: 'phase_name' },
    // { title: 'Reporting year', attr: 'phase_year' },
    { title: 'Indicator category', attr: 'result_type' },
    { title: 'Submitter', attr: 'submitter' },
    { title: 'Status', attr: 'status_name' },
    { title: 'Creation date	', attr: 'created_date' },
    { title: 'Created by	', attr: 'full_name' }
  ];

  items: MenuItem[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        //('showShareRequest');
        this.api.dataControlSE.showShareRequest = true;
        //(this.api.resultsSE.currentResultId);
        // event
      }
    }
    // { label: 'Edit', icon: 'pi pi-fw pi-pencil' },
    // { label: 'Submit', icon: 'pi pi-fw pi-reply' }
  ];

  itemsWithDelete: MenuItem[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        //('showShareRequest');
        this.api.dataControlSE.showShareRequest = true;
        //(this.api.resultsSE.currentResultId);
        // event
      }
    },
    {
      label: 'Update result',
      icon: 'pi pi-fw pi-clone',
      command: () => {
        this.api.dataControlSE.chagePhaseModal = true;
      }
    },
    // { label: 'Edit', icon: 'pi pi-fw pi-pencil' },
    {
      label: 'Delete',
      icon: 'pi pi-fw pi-trash',
      command: () => {
        this.onDeleteREsult();
      }
    }
    // { label: 'Submit', icon: 'pi pi-fw pi-reply' }
  ];
  @ViewChild('table') table: Table;
  constructor(public api: ApiService, public resultsListService: ResultsListService, private ResultLevelSE: ResultLevelService, private exportTablesSE: ExportTablesService, private shareRequestModalSE: ShareRequestModalService, private retrieveModalSE: RetrieveModalService, public phasesService: PhasesService) {}

  validateOrder(columnAttr) {
    setTimeout(() => {
      //(columnAttr);
      if (columnAttr == 'result_code') return (this.combine = true);
      const resultListTableHTML = document.getElementById('resultListTable');
      // if (document.getElementById('resultListTable').querySelectorAll('th[aria-sort="ascending"]').length) this.resetSort();
      this.combine = !resultListTableHTML.querySelectorAll('th[aria-sort="descending"]').length && !resultListTableHTML.querySelectorAll('th[aria-sort="ascending"]').length;
      // //(document.getElementById('resultListTable').querySelectorAll('th[aria-sort="descending"]').length); ascending
      // this.resetSort();
      return null;
    }, 100);
  }
  resetSort() {
    this.table.sortOrder = 0;
    this.table.sortField = '';
    this.table.reset();
  }

  ngOnInit(): void {
    // this.api.rolesSE.validateReadOnly();
    this.api.updateResultsList();
    this.items;
    // this.api.alertsFs.show({
    //   id: 'indoasd',
    //   status: 'success',
    //   title: '',
    //   description: internationalizationData?.resultsList?.alerts?.info,
    //   querySelector: '.alert',
    //   position: 'beforebegin'
    // });
    this.shareRequestModalSE.inNotifications = false;
  }
  onPressAction(result) {
    //(result);
    this.retrieveModalSE.title = result?.title;
    this.api.resultsSE.currentResultId = result?.id;
    this.api.dataControlSE.currentResult = result;
  }

  onDownLoadTableAsExcel() {
    this.gettingReport = true;
    this.api.resultsSE.GET_reportingList().subscribe(
      ({ response }) => {
        //(response);
        this.exportTablesSE.exportExcel(response, 'results_list');
        this.gettingReport = false;
      },
      err => {
        console.error(err);
        this.gettingReport = false;
      }
    );
  }

  onDeleteREsult() {
    //(this.api.dataControlSE.currentResult);
    this.api.alertsFe.show({ id: 'confirm-delete-result', title: `Are you sure you want to delete the result "${this.api.dataControlSE?.currentResult?.title}"?`, description: `If you delete this result it will no longer be displayed in the list of results.`, status: 'success', confirmText: 'Yes, delete' }, () => {
      //('delete');
      this.api.resultsSE.PATCH_DeleteResult(this.api.dataControlSE.currentResult.id).subscribe(
        resp => {
          //(resp);
          this.api.alertsFe.show({ id: 'confirm-delete-result-su', title: `The result "${this.api.dataControlSE?.currentResult?.title}" was deleted`, description: ``, status: 'success' });
          this.api.updateResultsList();
        },
        err => {
          console.error(err);
          this.api.alertsFe.show({ id: 'delete-error', title: 'Error when delete result', description: '', status: 'error' });
        }
      );
    });
  }
  ngOnDestroy(): void {
    this.api.dataControlSE?.myInitiativesList.map(item => (item.selected = true));
  }
}
