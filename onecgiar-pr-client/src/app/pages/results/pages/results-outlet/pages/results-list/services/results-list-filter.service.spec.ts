import { TestBed } from '@angular/core/testing';

import { ResultsListFilterService } from './results-list-filter.service';

describe('ResultsListFilterService', () => {
  let service: ResultsListFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultsListFilterService);
  });

  describe('updateMyInitiatives()', () => {
    it('should update initiatives', () => {
      const initiatives = [{ name: 'Initiative 1', initiative_id: 1 }, { name: 'Initiative 2', initiative_id: 2 }];
      service.updateMyInitiatives(initiatives);
      const options = service.filters.general[0].options;
  
      expect(options.length).toBe(initiatives.length + 2);
      expect(options[0].name).toBe('All results');
      expect(options[0].selected).toBeFalsy();
      expect(options[0].cleanAll).toBeTruthy();
      expect(options[options.length - 1].attr).toBe('is_legacy');
      expect(options[options.length - 1].name).toBe('Pre-2022 results');
    });
  });

  describe('onSelectChip()', () => {
    it('should toggle chip selection and update "All results" accordingly', () => {
      const option = { name: 'Initiative', selected: false };
      service.filters.general = [
        {
          options : [
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
  });

  describe('onSelectChip()', () => {
    it('should clean all filters when "cleanAll" is true and the option is selected', () => {
      service.filters.general = [
        {
          options : [
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
      service.filters.resultLevel = [
        {
          id: 1,
          options: [
            { id: 1, selected: true },
            { id: 2, selected: false },
          ],
        },
      ];

      service.cleanAllFilters(service.filters.general[0].options[1]);

      expect(service.filters.general[0].options[1].selected).toBeFalsy();
      expect(service.filters.resultLevel[0].options[0].selected).toBeFalsy();
    });
    it('should not clean filters when the option is not selected', () => {
      service.filters.general = [
        {
          options : [
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
      service.filters.resultLevel = [
        {
          id: 1,
          options: [
            { id: 1, selected: false },
            { id: 2, selected: false },
          ],
        },
      ];
  
      service.cleanAllFilters(service.filters.general[0].options[1]);
  
      expect(service.filters.general[0].options[1].selected).toBeFalsy();
      expect(service.filters.resultLevel[0].options[0].selected).toBeFalsy();
    });
    it('should not clean filters when "cleanAll" is false', () => {
      service.filters.general = [
        {
          options : [
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
      service.filters.resultLevel = [
        {
          id: 1,
          options: [
            { id: 1, selected: true },
            { id: 2, selected: false },
          ],
        },
      ];
  
      service.cleanAllFilters(service.filters.general[0].options[0]);

      expect(service.filters.general[0].options[0].selected).toBeTruthy();
      expect(service.filters.resultLevel[0].options[0].selected).toBeTruthy();
    });
  });

  describe('setFiltersByResultLevelTypes()', () => {
    it('should set filters by result level types', () => {
      const resultLevelTypes = [
        { id: 1, result_type: [{ id: 1, selected: true }, { id: 2, selected: false }] },
        { id: 2, result_type: [{ id: 3, selected: false }, { id: 4, selected: true }] },
      ];
  
      service.setFiltersByResultLevelTypes(resultLevelTypes);
  
      expect(service.filters.resultLevel).toEqual(resultLevelTypes);     
    });
  });
});
