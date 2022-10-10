import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResultsListFilterService {
  filters = {
    general: [
      {
        filter_title: 'Submitter (s)',
        attr: 'submitter',
        options: [{ name: 'All results', selected: false }, { name: 'INIT-17' }, { name: 'INIT-02' }, { name: 'Other submitters' }, { name: 'Pre-2022 results' }]
      },
      {
        filter_title: 'Reported year',
        attr: 'reported_year',
        options: [{ name: '2022' }, { name: '2023' }, { name: '2024' }]
      }
    ],
    resultLevel: [
      {
        filter_title: 'Impact',
        attr: 'result_type',
        options: [{ name: 'Impact contributions', selected: false }],
        class: 'impact'
      },
      {
        filter_title: 'Outcomes',
        attr: 'result_type',
        options: [{ name: 'Policy Change', selected: false }, { name: 'Innovation Use' }, { name: 'Other' }],
        class: 'outcomes'
      },
      {
        filter_title: 'Outputs',
        attr: 'result_type',
        options: [{ name: 'Knowledge products', selected: false }, { name: 'Innovation development' }, { name: 'Capacity sharing for development' }, { name: 'Other' }],
        class: 'outputs'
      }
    ]
  };

  constructor() {}
  filtersPipeList = [];
  filterJoin: string;
  get filtersPipe(): FiltersPipe[] {
    let listFiltered = [];
    this.filters.general.map(filter => {
      let optionsSelected = [];
      filter?.options.map(option => {
        if (option.selected === true) optionsSelected.push(option?.name);
      });
      if (optionsSelected.length) listFiltered.push({ attr: filter.attr, options: optionsSelected });
    });
    this.filters.resultLevel.map(filter => {
      let optionsSelected = [];
      filter?.options.map(option => {
        if (option.selected === true) optionsSelected.push(option?.name);
      });
      if (optionsSelected.length) listFiltered.push({ attr: filter.attr, options: optionsSelected });
    });
    return listFiltered;
    // [
    //   { attr: 'result_type', options: ['Knowledge Product', 'Organizational change'] },
    //   { attr: 'submitter', options: ['INIT-30'] }
    // ];
  }

  onSelectChip(option: any) {
    option.selected = !option.selected;
    this.filterJoin += 'd';
  }
}

interface FiltersPipe {
  attr: string;
  options: string[];
}
