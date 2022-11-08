import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { internationalizationData } from '../../../../../../shared/data/internationalizationData';
import { ResultsListService } from './services/results-list.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';

@Component({
  selector: 'app-results-list',
  templateUrl: './results-list.component.html',
  styleUrls: ['./results-list.component.scss', './results-list.responsive.scss']
})
export class ResultsListComponent implements OnInit {
  columnOrder = [
    { title: 'ID', attr: 'id' },
    { title: 'Title', attr: 'title', class: 'notCenter' },
    { title: 'Reporting year', attr: 'reported_year' },
    { title: 'Result type', attr: 'result_type' },
    { title: 'Submitter', attr: 'submitter' },
    { title: 'Status', attr: 'status_name' },
    { title: 'Creation date	', attr: 'created_date' }
  ];

  items: MenuItem[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        // event
      }
    },
    { label: 'Edit', icon: 'pi pi-fw pi-pencil' },
    { label: 'Delete', icon: 'pi pi-fw pi-trash' },
    { label: 'Submit', icon: 'pi pi-fw pi-reply' }
  ];
  constructor(public api: ApiService, public resultsListService: ResultsListService, private ResultLevelSE: ResultLevelService) {}

  ngOnInit(): void {
    this.api.updateResultsList();
    this.items;
    this.api.alertsFs.show({
      id: 'indoasd',
      status: 'success',
      title: '',
      description: internationalizationData?.resultsList?.alerts?.info,
      querySelector: '.alert',
      position: 'beforebegin'
    });
  }
}
