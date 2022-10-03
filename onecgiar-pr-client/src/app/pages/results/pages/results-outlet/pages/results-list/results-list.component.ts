import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-results-list',
  templateUrl: './results-list.component.html',
  styleUrls: ['./results-list.component.scss']
})
export class ResultsListComponent implements OnInit {
  columnOrder = [{ attr: 'id' }, { attr: 'title', class: 'notCenter' }, { attr: 'planned_year' }, { attr: 'result_type' }, { attr: 'owner' }, { attr: 'contributes_to' }, { attr: 'creation_date' }];
  results: any[] = [
    {
      id: '1',
      title: 'Lorem ipsum dolor, sit amet consectetur adipisicing elit. Dolorem perferendis ipsam voluptatibus magni. Fuga itaque earum nulla sapiente perspiciatis doloribus?',
      planned_year: '2022',
      result_type: 'Policy use',
      owner: 'INIT-17',
      contributes_to: 'Outcome 1.1',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    },
    {
      id: '2',
      title: 'Policy 2',
      planned_year: '2022',
      result_type: 'Policy use',
      owner: 'INIT-08',
      contributes_to: 'EOI-0-2',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    },
    {
      id: '3',
      title: 'Innovation 1',
      planned_year: '2022',
      result_type: 'Innovation use',
      owner: 'INIT-20',
      contributes_to: 'AA-O 3',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    },
    {
      id: '4',
      title: 'Innovation 2',
      planned_year: '2022',
      result_type: 'Innovation use',
      owner: 'INIT-28',
      contributes_to: 'Outcome 3.2',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    },
    {
      id: '5',
      title: 'Other Outcome 1',
      planned_year: '2022',
      result_type: 'Other outcome',
      owner: 'INIT-31',
      contributes_to: 'AA-O 3',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    },
    {
      id: '6',
      title: 'Knowledge product 1',
      planned_year: '2022',
      result_type: 'Knowledge Product',
      owner: 'INIT-17',
      contributes_to: 'Output 2.1',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    },
    {
      id: '7',
      title: 'Innovation pkg 1',
      planned_year: '2022',
      result_type: 'Innovation',
      owner: 'INIT-07',
      contributes_to: 'Output 1.3',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    },
    {
      id: '8',
      title: 'CapDev 1',
      planned_year: '2022',
      result_type: 'CapDev',
      owner: 'INIT-01',
      contributes_to: 'Output 3.1',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    },
    {
      id: '9',
      title: 'Other Output 1',
      planned_year: '2022',
      result_type: 'Other output',
      owner: 'Legacy',
      contributes_to: 'N/A',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    },
    {
      id: '10',
      title: 'Legacy KP',
      planned_year: '2022',
      result_type: 'Knowledge Product',
      owner: 'Legacy',
      contributes_to: 'N/A',
      creation_date: '09/30/2022, 9:20:42 AM',
      action: ''
    }
  ];
  items: MenuItem[] = [
    {
      label: 'Map to TOC',
      icon: 'pi pi-fw pi-sitemap',
      command: () => {
        console.log('hola mundo');
      }
    },
    { label: 'Edit', icon: 'pi pi-fw pi-pencil' },
    { label: 'Delete', icon: 'pi pi-fw pi-trash' },
    { label: 'Submit', icon: 'pi pi-fw pi-reply' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.items;
  }
}
