import { Injectable } from '@angular/core';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ResultsListFilterService {
  filters: any = {
    general: [
      {
        filter_title: 'Submitter (s)',
        attr: 'submitter',
        options: [
          { name: 'All results', selected: false, cleanAll: true },
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
    resultLevel: []
  };

  get getFilters() {
    return 0;
  }
  constructor() {}
  filtersPipeList = [];
  filterJoin: number = 0;

  updateMyInitiatives(initiatives) {
    initiatives.map(init => {
      init.selected = true;
      init.attr = init.name;
      init.id = init.initiative_id;
    });
    this.filters.general[0].options = [{ name: 'All results', selected: false, cleanAll: true }, ...initiatives, { attr: '', name: 'Other submitters' }, { attr: '', name: 'Pre-2022 results' }];
    // get fist element from array in js without index?
  }

  // get filtersPipe() {
  //   // let generalListFiltered = [];
  //   // let resultLevelListFiltered = [];
  //   // this.filters.general.map(filter => {
  //   //   let optionsSelected = [];
  //   //   filter?.options.map(option => {
  //   //     if (option.selected === true) optionsSelected.push(option?.attr);
  //   //   });
  //   //   if (optionsSelected.length) generalListFiltered.push({ attr: filter.attr, options: optionsSelected });
  //   // });
  //   // this.filters.resultLevel.map(filter => {
  //   //   let optionsSelected = [];
  //   //   filter?.options.map(option => {
  //   //     if (option.selected === true) optionsSelected.push(option?.attr);
  //   //   });
  //   //   if (optionsSelected.length) resultLevelListFiltered.push({ attr: filter.attr, options: optionsSelected });
  //   // });
  //   console.log({ generalListFiltered, resultLevelListFiltered });
  //   return { generalListFiltered, resultLevelListFiltered };
  // }

  onSelectChip(option: any) {
    console.log(option);
    option.selected = !option.selected;
    if (option.name != 'All results') this.filters.general[0].options[0].selected = false;

    this.filterJoin++;
  }
  cleanAllFilters(option) {
    if (!option.selected) return;
    if (option?.cleanAll !== true) return;
    this.filters.general.map(filter => {
      filter.options.map(option => {
        option.selected = false;
      });
    });
    this.filters.resultLevel.map(filter => {
      filter.options.map(option => {
        option.selected = false;
      });
    });
    this.filters.general[0].options[0].selected = true;
  }

  setFiltersByResultLevelTypes(resultLevelTypes) {
    this.filters.resultLevel = resultLevelTypes;
    this.filters.resultLevel.map(resultLevel => (resultLevel.options = resultLevel?.result_type));
  }
}

// resultLevel: [
//   {
//     filter_title: 'Impact',
//     attr: 'result_type',
//     options: [{ attr: 'Impact Contribution', name: 'Impact contributions', selected: false }],
//     class: 'impact'
//   },
//   {
//     filter_title: 'Outcomes',
//     attr: 'result_type',
//     options: [
//       { attr: 'Policy Change', name: 'Policy Change', selected: false },
//       { attr: 'Innovation use', name: 'Innovation Use' },
//       { attr: 'Organizational change', name: 'Organizational change' },
//       { attr: 'Other outcome', name: 'Other' }
//     ],
//     class: 'outcomes'
//   },
//   {
//     filter_title: 'Outputs',
//     attr: 'result_type',
//     options: [
//       { attr: 'Knowledge Product', name: 'Knowledge products', selected: false },
//       { attr: 'Innovation Development', name: 'Innovation development' },
//       { attr: 'Capacity Sharing for Development', name: 'Capacity sharing for development' },
//       { attr: 'Other output', name: 'Other' }
//     ],
//     class: 'outputs'
//   }
// ]

interface FiltersPipe {
  attr: string;
  options: string[];
}
