import { TestBed } from '@angular/core/testing';
import { IpsrListFilterService } from '../../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../../services/ipsr-list.service';
import { InnovationPackageListFilterPipe } from './innovation-package-list-filter.pipe';

describe('InnovationPackageListFilterPipe', () => {
  let pipe: InnovationPackageListFilterPipe;
  let ipsrListFilterService: IpsrListFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InnovationPackageListFilterPipe,
        { provide: IpsrListService, useValue: {} },
        { provide: IpsrListFilterService, useValue: { filters: { general: [{ options: [] }, { options: [] }] } } }
      ]
    });
    pipe = TestBed.inject(InnovationPackageListFilterPipe);
    ipsrListFilterService = TestBed.inject(IpsrListFilterService);
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should filter by text', () => {
    const list = [{ full_name: 'Test' }, { full_name: 'Example' }];
    const word = 'Test';
    const result = pipe.filterByText(list, word);
    expect(result).toEqual([{ full_name: 'Test' }]);
  });

  it('should filter by initiatives', () => {
    const list = [{ official_code: 'Init1' }, { official_code: 'Init2' }];
    ipsrListFilterService.filters.general[0].options = [{ attr: 'Init1', selected: true }];
    const result = pipe.filterByInits(list);
    expect(result).toEqual([{ official_code: 'Init1' }]);
  });

  it('should filter by phase', () => {
    const list = [{ phase_name: 'Phase1' }, { phase_name: 'Phase2' }];
    ipsrListFilterService.filters.general[1].options = [{ attr: 'Phase1', selected: true }];
    const result = pipe.filterByPhase(list);
    expect(result).toEqual([{ phase_name: 'Phase1' }]);
  });

  it('should transform the list', () => {
    const list = [{ full_name: 'Test', official_code: 'Init1', phase_name: 'Phase1', result_code: 'Code1', phase_year: 2021 }];
    const word = 'Test';
    ipsrListFilterService.filters.general[0].options = [{ attr: 'Init1', selected: true }];
    ipsrListFilterService.filters.general[1].options = [{ attr: 'Phase1', selected: true }];
    const result = pipe.transform(list, word);
    expect(result).toEqual([
      { full_name: 'Test', official_code: 'Init1', phase_name: 'Phase1', result_code: 'Code1', phase_year: 2021, results: list }
    ]);
  });
});
