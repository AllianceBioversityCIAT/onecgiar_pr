import { Injectable, signal } from '@angular/core';

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
        filter_title: 'Phases',
        attr: 'phase_name',
        options: []
      }
    ],
    resultLevel: []
  };
  filterJoin: number = 0;

  phasesOptionsOld = signal([]);
  phasesOptions = signal([]);
  submittersOptionsOld = signal([]);
  submittersOptions = signal([]);
  statusOptions = signal([]);

  selectedPhases = signal([]);
  selectedSubmitters = signal([]);
  selectedIndicatorCategories = signal([]);
  selectedStatus = signal([]);
  text_to_search = signal('');

  updateMyInitiatives(initiatives) {
    initiatives?.forEach(init => {
      init.selected = true;
      init.attr = init.name;
      init.id = init.initiative_id;
    });
    this.filters.general[0].options = [
      { name: 'All results', selected: false, cleanAll: true, id: 0, portfolio_id: 0 },
      ...initiatives,
      { attr: 'is_legacy', name: 'Pre-2022 results', id: 999, portfolio_id: 2 }
    ];
    this.submittersOptionsOld.set([{ name: 'All results', selected: false, cleanAll: true, id: 0, portfolio_id: 0 }, ...initiatives]);
    this.submittersOptions.set([{ name: 'All results', selected: false, cleanAll: true, id: 0, portfolio_id: 0 }, ...initiatives]);
  }

  onSelectChip(option: any) {
    option.selected = !option.selected;
    if (option.name != 'All results') this.filters.general[0].options[0].selected = false;
    this.filterJoin++;
  }

  cleanAllFilters(option) {
    if (!option.selected) return;
    if (option?.cleanAll !== true) return;
    this.filters.general.forEach(filter => {
      filter.options.forEach(option => {
        option.selected = false;
      });
    });
    this.filters.resultLevel.forEach(filter => {
      filter.options.forEach(option => {
        option.selected = false;
      });
    });
    this.filters.general[0].options[0].selected = true;
  }

  setFiltersByResultLevelTypes(resultLevelTypes) {
    this.filters.resultLevel = resultLevelTypes;
    this.filters.resultLevel.forEach(resultLevel => (resultLevel.options = resultLevel?.result_type));
    this.filters.resultLevel.forEach((resultLevelOption: any) => {
      resultLevelOption.options.forEach((resultTypeOption: any) => {
        resultTypeOption.resultLevelId = resultLevelOption.id;
      });
    });
  }

  clearAllNewFilters() {
    this.selectedPhases.set([]);
    this.selectedSubmitters.set([]);
    this.selectedIndicatorCategories.set([]);
    this.selectedStatus.set([]);
    this.text_to_search.set('');
  }
}
