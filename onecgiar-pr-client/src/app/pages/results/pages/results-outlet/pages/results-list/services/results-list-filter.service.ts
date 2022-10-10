import { Injectable } from '@angular/core';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResultsListFilterService {
  filters = {
    general: [
      {
        filter_title: 'Submitter (s)',
        attr: 'submitter',
        options: [
          { attr: '', name: 'All results', selected: false },
          { attr: '', name: 'Other submitters' },
          { attr: '', name: 'Pre-2022 results' }
        ]
      },
      {
        filter_title: 'Reported year',
        attr: 'reported_year',
        options: [
          { attr: '2022', selected: true, name: '2022' },
          { attr: '2023', name: '2023' },
          { attr: '2024', name: '2024' }
        ]
      }
    ],
    resultLevel: [
      {
        filter_title: 'Impact',
        attr: 'result_type',
        options: [{ attr: 'Impact Contribution', name: 'Impact contributions', selected: false }],
        class: 'impact'
      },
      {
        filter_title: 'Outcomes',
        attr: 'result_type',
        options: [
          { attr: 'Policy Change', name: 'Policy Change', selected: false },
          { attr: 'Innovation use', name: 'Innovation Use' },
          { attr: 'Organizational change', name: 'Organizational change' },
          { attr: 'Other outcome', name: 'Other' }
        ],
        class: 'outcomes'
      },
      {
        filter_title: 'Outputs',
        attr: 'result_type',
        options: [
          { attr: 'Knowledge Product', name: 'Knowledge products', selected: false },
          { attr: 'Innovation Developmen', name: 'Innovation development' },
          { attr: 'Capacity Sharing for Development', name: 'Capacity sharing for development' },
          { attr: 'Other output', name: 'Other' }
        ],
        class: 'outputs'
      }
    ]
  };

  constructor() {}
  filtersPipeList = [];
  filterJoin: number = 0;

  updateMyInitiatives(initiatives) {
    console.log(initiatives);
    initiatives.map(init => {
      init.selected = true;
      init.attr = init.name;
    });
    this.filters.general[0].options = [{ attr: '', name: 'All results', selected: false }, ...initiatives, { attr: '', name: 'Other submitters' }, { attr: '', name: 'Pre-2022 results' }];
    // get fist element from array in js without index?
  }

  get filtersPipe() {
    let generalListFiltered = [];
    let resultLevelListFiltered = [];
    this.filters.general.map(filter => {
      let optionsSelected = [];
      filter?.options.map(option => {
        if (option.selected === true) optionsSelected.push(option?.attr);
      });
      if (optionsSelected.length) generalListFiltered.push({ attr: filter.attr, options: optionsSelected });
    });
    this.filters.resultLevel.map(filter => {
      let optionsSelected = [];
      filter?.options.map(option => {
        if (option.selected === true) optionsSelected.push(option?.attr);
      });
      if (optionsSelected.length) resultLevelListFiltered.push({ attr: filter.attr, options: optionsSelected });
    });
    return { generalListFiltered, resultLevelListFiltered };
    // [
    //   { attr: 'result_type', options: ['Knowledge Product', 'Organizational change'] },
    //   { attr: 'submitter', options: ['INIT-30'] }
    // ];
  }

  onSelectChip(option: any) {
    option.selected = !option.selected;
    this.filterJoin++;
  }
}

interface FiltersPipe {
  attr: string;
  options: string[];
}
