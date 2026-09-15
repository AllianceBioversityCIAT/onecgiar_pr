import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { IpsrListFilterService } from '../../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../../services/ipsr-list.service';
import { InnovationPackageListFilterPipe } from './innovation-package-list-filter.pipe';

describe('InnovationPackageListFilterPipe', () => {
  let pipe: InnovationPackageListFilterPipe;
  let ipsrListFilterService: {
    selectedPrograms: ReturnType<typeof signal>;
    selectedPhases: ReturnType<typeof signal>;
    selectedStatus: ReturnType<typeof signal>;
    selectedPortfolios: ReturnType<typeof signal>;
  };

  beforeEach(() => {
    ipsrListFilterService = {
      selectedPrograms: signal([]),
      selectedPhases: signal([]),
      selectedStatus: signal([]),
      selectedPortfolios: signal([])
    };

    TestBed.configureTestingModule({
      providers: [
        InnovationPackageListFilterPipe,
        { provide: IpsrListService, useValue: {} },
        { provide: IpsrListFilterService, useValue: ipsrListFilterService }
      ]
    });
    pipe = TestBed.inject(InnovationPackageListFilterPipe);
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

  describe('filterByInits', () => {
    it('returns the full list unmodified when selectedPrograms is empty (IPSR-DD-4)', () => {
      const list = [{ official_code: 'Init1' }, { official_code: 'Init2' }];
      const result = pipe.filterByInits(list);
      expect(result).toEqual(list);
    });

    it('narrows to matching rows and excludes non-matching ones when a Program is selected', () => {
      const list = [{ official_code: 'Init1' }, { official_code: 'Init2' }];
      ipsrListFilterService.selectedPrograms.set([{ official_code: 'Init1', displayName: 'Init1' }]);
      const result = pipe.filterByInits(list);
      expect(result).toEqual([{ official_code: 'Init1' }]);
    });
  });

  describe('filterByPhase', () => {
    it('returns the full list unmodified when selectedPhases is empty (IPSR-DD-4)', () => {
      const list = [{ phase_name: 'Phase1' }, { phase_name: 'Phase2' }];
      const result = pipe.filterByPhase(list);
      expect(result).toEqual(list);
    });

    it('narrows to matching rows and excludes non-matching ones when a Phase is selected', () => {
      const list = [{ phase_name: 'Phase1' }, { phase_name: 'Phase2' }];
      ipsrListFilterService.selectedPhases.set([{ attr: 'Phase1', name: 'Phase1', id: 1, selected: true }]);
      const result = pipe.filterByPhase(list);
      expect(result).toEqual([{ phase_name: 'Phase1' }]);
    });
  });

  describe('filterByStatus', () => {
    it('returns the full list unmodified when selectedStatus is empty (IPSR-DD-4)', () => {
      const list = [{ status: 'New' }, { status: 'Editing' }];
      const result = pipe.filterByStatus(list);
      expect(result).toEqual(list);
    });

    it('narrows to matching rows and excludes non-matching ones when a Status is selected', () => {
      const list = [{ status: 'New' }, { status: 'Editing' }];
      ipsrListFilterService.selectedStatus.set(['New']);
      const result = pipe.filterByStatus(list);
      expect(result).toEqual([{ status: 'New' }]);
    });
  });

  describe('filterByPortfolio', () => {
    it('returns the full list unmodified when selectedPortfolios is empty (IPSR-DD-4)', () => {
      const list = [{ portfolio_id: 1 }, { portfolio_id: 2 }];
      const result = pipe.filterByPortfolio(list);
      expect(result).toEqual(list);
    });

    it('narrows to matching rows and excludes non-matching ones when a Portfolio is selected', () => {
      const list = [{ portfolio_id: 1 }, { portfolio_id: 2 }];
      ipsrListFilterService.selectedPortfolios.set([{ id: 1, name: 'P25' }]);
      const result = pipe.filterByPortfolio(list);
      expect(result).toEqual([{ portfolio_id: 1 }]);
    });
  });

  it('combines Program + Status filters with AND semantics through transform() (matching the existing filterByInits+filterByPhase chain behavior)', () => {
    // Reachability: this must go through `transform()` — the pipe's only public entry point —
    // not by chaining private filter methods directly, otherwise deleting a method from the
    // `transform` chain would leave this test green.
    const list = [
      { full_name: 'Row A', official_code: 'Init1', status: 'New', result_code: 'R1', phase_year: 2021 },
      { full_name: 'Row B', official_code: 'Init1', status: 'Editing', result_code: 'R2', phase_year: 2021 },
      { full_name: 'Row C', official_code: 'Init2', status: 'New', result_code: 'R3', phase_year: 2021 }
    ];
    ipsrListFilterService.selectedPrograms.set([{ official_code: 'Init1', displayName: 'Init1' }]);
    ipsrListFilterService.selectedStatus.set(['New']);

    const result = pipe.transform(list, '');

    expect(result).toEqual([
      { full_name: 'Row A', official_code: 'Init1', status: 'New', result_code: 'R1', phase_year: 2021, results: [list[0]] }
    ]);
  });

  it('should transform the list', () => {
    const list = [{ full_name: 'Test', official_code: 'Init1', phase_name: 'Phase1', result_code: 'Code1', phase_year: 2021 }];
    const word = 'Test';
    ipsrListFilterService.selectedPrograms.set([{ official_code: 'Init1', displayName: 'Init1' }]);
    ipsrListFilterService.selectedPhases.set([{ attr: 'Phase1', name: 'Phase1', id: 1, selected: true }]);
    const result = pipe.transform(list, word);
    expect(result).toEqual([
      { full_name: 'Test', official_code: 'Init1', phase_name: 'Phase1', result_code: 'Code1', phase_year: 2021, results: list }
    ]);
  });
});
