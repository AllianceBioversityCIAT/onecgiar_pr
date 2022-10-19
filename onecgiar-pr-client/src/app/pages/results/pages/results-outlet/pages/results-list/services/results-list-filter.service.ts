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
        options: []
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

  constructor() {}
  filtersPipeList = [];
  filterJoin: number = 0;

  updateMyInitiatives(initiatives) {
    initiatives?.map(init => {
      init.selected = true;
      init.attr = init.name;
      init.id = init.initiative_id;
    });
    this.filters.general[0].options = [{ name: 'All results', selected: false, cleanAll: true }, ...initiatives, { attr: '', name: 'Other submitters' }, { attr: '', name: 'Pre-2022 results' }];
  }

  onSelectChip(option: any) {
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
