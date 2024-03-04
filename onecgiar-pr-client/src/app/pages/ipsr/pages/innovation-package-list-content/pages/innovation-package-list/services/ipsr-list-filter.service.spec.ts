import { TestBed } from '@angular/core/testing';

import { IpsrListFilterService } from './ipsr-list-filter.service';

describe('IpsrListFilterService', () => {
  let service: IpsrListFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IpsrListFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update initiatives', () => {
    const initiatives = [
      { name: 'Initiative 1', initiative_id: 1 },
      { name: 'Initiative 2', initiative_id: 2 }
    ];
    service.updateMyInitiatives(initiatives);
    const options = service.filters.general[0].options;

    expect(options.length).toBe(initiatives.length + 1);
    expect(options[0].name).toBe('All results');
    expect(options[0].selected).toBeFalsy();
    expect(options[0].cleanAll).toBeTruthy();
  });

  it('should toggle IPSR chip selection and update "All results" accordingly', () => {
    const option = { name: 'Initiative', selected: false };
    service.filters.general = [
      {
        options: [
          { name: 'All results', selected: false, cleanAll: true },
          {
            name: 'Initiative',
            initiative_id: 1,
            selected: true,
            attr: 'attr',
            id: 1
          },
          { attr: 'is_legacy', name: 'Pre-2022 results' }
        ]
      }
    ];
    const allResultsOption = service.filters.general[0].options[0];

    service.onSelectChip(option);

    expect(option.selected).toBeTruthy();
    expect(allResultsOption.selected).toBeFalsy();
  });

  it('should clean all IPSR filters when "cleanAll" is true and the option is selected', () => {
    service.filters.general = [
      {
        options: [
          { name: 'All results', selected: false, cleanAll: true },
          {
            name: 'Initiative',
            initiative_id: 1,
            selected: true,
            attr: 'attr',
            id: 1,
            cleanAll: true
          },
          { attr: 'is_legacy', name: 'Pre-2022 results' }
        ]
      }
    ];

    service.cleanAllFilters(service.filters.general[0].options[1]);

    expect(service.filters.general[0].options[1].selected).toBeFalsy();
  });
  it('should not clean IPSR filters when the option is not selected', () => {
    service.filters.general = [
      {
        options: [
          { name: 'All results', selected: true, cleanAll: true },
          {
            name: 'Initiative',
            initiative_id: 1,
            selected: false,
            attr: 'attr',
            id: 1,
            cleanAll: false
          },
          { attr: 'is_legacy', name: 'Pre-2022 results' }
        ]
      }
    ];

    service.cleanAllFilters(service.filters.general[0].options[1]);

    expect(service.filters.general[0].options[1].selected).toBeFalsy();
  });
  it('should not clean IPSR filters when "cleanAll" is false', () => {
    service.filters.general = [
      {
        options: [
          { name: 'All results', selected: true, cleanAll: false },
          {
            name: 'Initiative',
            initiative_id: 1,
            selected: false,
            attr: 'attr',
            id: 1,
            cleanAll: false
          },
          { attr: 'is_legacy', name: 'Pre-2022 results' }
        ]
      }
    ];

    service.cleanAllFilters(service.filters.general[0].options[0]);

    expect(service.filters.general[0].options[0].selected).toBeTruthy();
  });
});
