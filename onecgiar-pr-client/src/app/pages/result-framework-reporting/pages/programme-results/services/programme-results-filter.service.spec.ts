import { TestBed } from '@angular/core/testing';
import {
  buildCategoryFilterOptions,
  buildStatusCounts,
  isStandardRfCategory,
  matchesProgrammeResultCategory,
  matchesProgrammeResultFilters,
  matchesProgrammeResultSearch,
  PROGRAMME_RESULTS_OTHER_CATEGORY,
  ProgrammeResultsFilterService,
  STANDARD_RF_CATEGORIES
} from './programme-results-filter.service';
import { ProgrammeResultRow } from './programme-results.service';

function row(partial: Partial<ProgrammeResultRow> = {}): ProgrammeResultRow {
  return {
    id: 1,
    code: '5834',
    title: 'Breeding pipeline optimisation',
    category: 'Innovation development',
    statusId: 1,
    statusName: 'Editing',
    createdBy: 'Guest Tester',
    created: '2025-08-29T16:37:46.000Z',
    origin: 'W1/W2',
    center: '',
    updated: '',
    indicator: '',
    section: '',
    versionId: '34',
    submitterCode: 'SP01',
    ...partial
  };
}

describe('ProgrammeResultsFilterService', () => {
  let service: ProgrammeResultsFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ProgrammeResultsFilterService] });
    service = TestBed.inject(ProgrammeResultsFilterService);
  });

  it('starts with every dimension empty and no chips', () => {
    expect(service.searchText()).toBe('');
    expect(service.selectedSections()).toEqual([]);
    expect(service.selectedPhase()).toBeNull();
    expect(service.selectedStatus()).toBeNull();
    expect(service.selectedCategory()).toBeNull();
    expect(service.selectedOrigin()).toBeNull();
    expect(service.selectedCenter()).toBeNull();
    expect(service.selectedCreatedBy()).toBeNull();
    expect(service.hasActiveFilters()).toBe(false);
    expect(service.activeChips()).toEqual([]);
  });

  describe('search predicate', () => {
    const target = row({ title: 'Breeding pipeline optimisation', code: '5834' });

    it('matches the title case-insensitively on a substring', () => {
      expect(matchesProgrammeResultSearch(target, 'PIPELINE')).toBe(true);
      expect(matchesProgrammeResultSearch(target, 'breeding')).toBe(true);
    });

    it('matches the code as well as the title', () => {
      expect(matchesProgrammeResultSearch(target, '5834')).toBe(true);
      expect(matchesProgrammeResultSearch(target, '583')).toBe(true);
    });

    it('rejects text that is in neither the title nor the code', () => {
      expect(matchesProgrammeResultSearch(target, 'climate')).toBe(false);
    });

    it('passes everything when the text is empty or only spaces', () => {
      expect(matchesProgrammeResultSearch(target, '')).toBe(true);
      expect(matchesProgrammeResultSearch(target, '   ')).toBe(true);
    });

    it('does not leak other columns into the search', () => {
      // `SP01` is the submitter of every row in a programme; matching it would make the
      // filter look broken (it would return the whole list).
      expect(matchesProgrammeResultSearch(target, 'SP01')).toBe(false);
      expect(matchesProgrammeResultSearch(target, 'Guest')).toBe(false);
      expect(matchesProgrammeResultSearch(target, 'W1/W2')).toBe(false);
    });
  });

  describe('filterRows()', () => {
    const rows = [
      row({ code: '1', title: 'Alpha maize trial', statusName: 'Editing', category: 'Innovation development', origin: 'W1/W2' }),
      row({ code: '2', title: 'Beta policy note', statusName: 'Submitted', category: 'Policy change', origin: 'W3/Bilaterals' }),
      row({ code: '3', title: 'Gamma training', statusName: 'Submitted', category: 'Capacity sharing', origin: 'W1/W2' })
    ];

    it('returns every row when nothing is selected', () => {
      expect(service.filterRows(rows)).toHaveLength(3);
    });

    it('filters by search text over title and code', () => {
      service.searchText.set('beta');
      expect(service.filterRows(rows).map(r => r.code)).toEqual(['2']);

      service.searchText.set('3');
      expect(service.filterRows(rows).map(r => r.code)).toEqual(['3']);
    });

    it('filters by status, category and origin', () => {
      service.selectedStatus.set('Submitted');
      expect(service.filterRows(rows).map(r => r.code)).toEqual(['2', '3']);

      service.selectedOrigin.set('W1/W2');
      expect(service.filterRows(rows).map(r => r.code)).toEqual(['3']);

      service.selectedCategory.set('Policy change');
      expect(service.filterRows(rows)).toEqual([]);
    });

    it('filters by center, matching a row and rejecting a row with an empty center', () => {
      const centerRows = [
        row({ code: '1', center: 'IITA' }),
        row({ code: '2', center: 'IWMI' }),
        row({ code: '3', center: '' })
      ];

      service.selectedCenter.set('IITA');
      expect(service.filterRows(centerRows).map(r => r.code)).toEqual(['1']);

      service.selectedCenter.set('IWMI');
      expect(service.filterRows(centerRows).map(r => r.code)).toEqual(['2']);
    });

    it('filters by phase, matching row phaseName, phaseYear, or versionId', () => {
      const phaseRows = [
        row({ code: '1', phaseName: 'Reporting 2026 - P26', phaseYear: 2026, versionId: '36' }),
        row({ code: '2', phaseName: 'Reporting 2024 - P24', phaseYear: 2024, versionId: '20' })
      ];

      service.selectedPhase.set('Reporting 2026 - P26');
      expect(service.filterRows(phaseRows).map(r => r.code)).toEqual(['1']);

      service.selectedPhase.set('2024');
      expect(service.filterRows(phaseRows).map(r => r.code)).toEqual(['2']);
    });

    it('combines every dimension with AND', () => {
      service.searchText.set('a');
      service.selectedStatus.set('Editing');
      service.selectedCategory.set('Innovation development');
      service.selectedOrigin.set('W1/W2');

      expect(service.filterRows(rows).map(r => r.code)).toEqual(['1']);
    });

    it('ignores the status dimension when asked, so the counters can stay honest', () => {
      service.selectedStatus.set('Editing');
      service.selectedOrigin.set('W1/W2');

      expect(service.filterRows(rows).map(r => r.code)).toEqual(['1']);
      expect(service.filterRows(rows, { ignoreStatus: true }).map(r => r.code)).toEqual(['1', '3']);
    });

    it('treats the section multi-select as OR within the dimension', () => {
      const sectioned = [row({ code: '1', section: 'AoW1' }), row({ code: '2', section: 'AoW2' }), row({ code: '3', section: 'AoW3' })];
      service.selectedSections.set(['AoW1', 'AoW3']);

      expect(service.filterRows(sectioned).map(r => r.code)).toEqual(['1', '3']);
    });

    it('tolerates a null row list', () => {
      expect(service.filterRows(null as unknown as ProgrammeResultRow[])).toEqual([]);
    });

    it('is driven by the same pure predicate the service uses', () => {
      service.selectedStatus.set('Submitted');
      expect(matchesProgrammeResultFilters(rows[0], service.state())).toBe(false);
      expect(matchesProgrammeResultFilters(rows[1], service.state())).toBe(true);
    });
  });

  describe('activeChips()', () => {
    it('builds one chip per active value, in toolbar order', () => {
      service.searchText.set('maize');
      service.selectedSections.set(['AoW1', 'AoW2']);
      service.selectedPhase.set('Phase 2026');
      service.selectedStatus.set('Submitted');
      service.selectedCategory.set('Policy change');
      service.selectedOrigin.set('W1/W2');
      service.selectedCenter.set('IITA');
      service.selectedCreatedBy.set('Angel Jarrin');

      expect(service.activeChips()).toEqual([
        { label: 'Search: maize', dimension: 'search', value: 'maize' },
        { label: 'Section: AoW1', dimension: 'section', value: 'AoW1' },
        { label: 'Section: AoW2', dimension: 'section', value: 'AoW2' },
        { label: 'Phase: Phase 2026', dimension: 'phase', value: 'Phase 2026' },
        { label: 'Status: Submitted', dimension: 'status', value: 'Submitted' },
        { label: 'Category: Policy change', dimension: 'category', value: 'Policy change' },
        { label: 'Funding source: W1/W2', dimension: 'origin', value: 'W1/W2' },
        { label: 'Center: IITA', dimension: 'center', value: 'IITA' },
        { label: 'Created by: Angel Jarrin', dimension: 'createdBy', value: 'Angel Jarrin' }
      ]);
      expect(service.hasActiveFilters()).toBe(true);
    });

    it('trims the search chip and skips a whitespace-only search', () => {
      service.searchText.set('  maize  ');
      expect(service.activeChips()).toEqual([{ label: 'Search: maize', dimension: 'search', value: 'maize' }]);

      service.searchText.set('   ');
      expect(service.activeChips()).toEqual([]);
      expect(service.hasActiveFilters()).toBe(false);
    });
  });

  describe('clearing', () => {
    beforeEach(() => {
      service.searchText.set('maize');
      service.selectedSections.set(['AoW1', 'AoW2']);
      service.selectedPhase.set('Phase 2026');
      service.selectedStatus.set('Submitted');
      service.selectedCategory.set('Policy change');
      service.selectedOrigin.set('W1/W2');
      service.selectedCenter.set('IITA');
      service.selectedCreatedBy.set('Angel Jarrin');
    });

    it('clears one dimension at a time', () => {
      service.clearSearch();
      expect(service.searchText()).toBe('');

      service.clearPhase();
      expect(service.selectedPhase()).toBeNull();

      service.clearStatus();
      expect(service.selectedStatus()).toBeNull();

      service.clearCategory();
      expect(service.selectedCategory()).toBeNull();

      service.clearOrigin();
      expect(service.selectedOrigin()).toBeNull();

      service.clearCenter();
      expect(service.selectedCenter()).toBeNull();

      service.clearCreatedBy();
      expect(service.selectedCreatedBy()).toBeNull();

      expect(service.selectedSections()).toEqual(['AoW1', 'AoW2']);
    });

    it('clears one section or all of them', () => {
      service.clearSections('AoW1');
      expect(service.selectedSections()).toEqual(['AoW2']);

      service.clearSections();
      expect(service.selectedSections()).toEqual([]);
    });

    it('clearChip() removes exactly the filter behind the chip', () => {
      const chips = service.activeChips();
      service.clearChip(chips.find(chip => chip.dimension === 'section' && chip.value === 'AoW2')!);

      expect(service.selectedSections()).toEqual(['AoW1']);
      expect(service.searchText()).toBe('maize');
      expect(service.selectedStatus()).toBe('Submitted');

      service.clearChip(chips.find(chip => chip.dimension === 'status')!);
      expect(service.selectedStatus()).toBeNull();

      service.clearChip(chips.find(chip => chip.dimension === 'phase')!);
      expect(service.selectedPhase()).toBeNull();

      service.clearChip(chips.find(chip => chip.dimension === 'center')!);
      expect(service.selectedCenter()).toBeNull();

      service.clearChip(chips.find(chip => chip.dimension === 'createdBy')!);
      expect(service.selectedCreatedBy()).toBeNull();
    });

    it('clearChip() is a no-op on an unknown dimension', () => {
      service.clearChip({ label: 'x', dimension: 'nope' as any, value: 'x' });
      expect(service.activeChips()).toHaveLength(9);
      service.clearChip(undefined as any);
      expect(service.activeChips()).toHaveLength(9);
    });

    it('clearAll() resets all eight dimensions at once', () => {
      service.clearAll();

      expect(service.searchText()).toBe('');
      expect(service.selectedSections()).toEqual([]);
      expect(service.selectedPhase()).toBeNull();
      expect(service.selectedStatus()).toBeNull();
      expect(service.selectedCategory()).toBeNull();
      expect(service.selectedOrigin()).toBeNull();
      expect(service.selectedCenter()).toBeNull();
      expect(service.selectedCreatedBy()).toBeNull();
      expect(service.hasActiveFilters()).toBe(false);
      expect(service.activeChips()).toEqual([]);
    });
  });

  describe('toggles', () => {
    it('toggleSection() adds then removes a section', () => {
      service.toggleSection('AoW1');
      expect(service.selectedSections()).toEqual(['AoW1']);

      service.toggleSection('AoW2');
      expect(service.selectedSections()).toEqual(['AoW1', 'AoW2']);

      service.toggleSection('AoW1');
      expect(service.selectedSections()).toEqual(['AoW2']);
    });

    it('toggleStatus() sets a status and clears it when the same pill is clicked again', () => {
      service.toggleStatus('Submitted');
      expect(service.selectedStatus()).toBe('Submitted');

      service.toggleStatus('Editing');
      expect(service.selectedStatus()).toBe('Editing');

      service.toggleStatus('Editing');
      expect(service.selectedStatus()).toBeNull();
    });
  });

  describe('buildStatusCounts()', () => {
    it('counts by status name, descending, and keeps the status id for the token pair', () => {
      const rows = [
        row({ statusName: 'Editing', statusId: 1 }),
        row({ statusName: 'Editing', statusId: 1 }),
        row({ statusName: 'Submitted', statusId: 3 }),
        row({ statusName: '', statusId: null })
      ];

      expect(buildStatusCounts(rows)).toEqual([
        { statusId: 1, statusName: 'Editing', count: 2 },
        { statusId: 3, statusName: 'Submitted', count: 1 }
      ]);
    });

    it('counts the whole set, not the current page, and ties break by name', () => {
      const rows = [row({ statusName: 'Submitted', statusId: 3 }), row({ statusName: 'Editing', statusId: 1 })];

      expect(buildStatusCounts(rows).map(count => count.statusName)).toEqual(['Editing', 'Submitted']);
    });

    it('returns nothing for an empty or missing list', () => {
      expect(buildStatusCounts([])).toEqual([]);
      expect(buildStatusCounts(null as unknown as ProgrammeResultRow[])).toEqual([]);
    });

    it('pairs with filterRows({ ignoreStatus: true }) so every pill keeps its count', () => {
      const rows = [
        row({ code: '1', statusName: 'Editing', origin: 'W1/W2' }),
        row({ code: '2', statusName: 'Submitted', origin: 'W1/W2' }),
        row({ code: '3', statusName: 'Submitted', origin: 'W3/Bilaterals' })
      ];
      service.selectedStatus.set('Editing');
      service.selectedOrigin.set('W1/W2');

      expect(buildStatusCounts(service.filterRows(rows, { ignoreStatus: true }))).toEqual([
        { statusId: 1, statusName: 'Editing', count: 1 },
        { statusId: 1, statusName: 'Submitted', count: 1 }
      ]);
    });
  });
  // ── P2-3312 ───────────────────────────────────────────────────────────────────────────────
  // End-user feedback (Nicoleta, via Santiago): the Category dropdown must offer the Results
  // Framework categories only, with everything else collapsed into one "Other" bucket. These
  // lock BOTH halves — the options that are built, and the rows the bucket then selects.
  describe('standard RF categories (P2-3312)', () => {
    /** Every non-RF `result_type` this endpoint can return (ids 3, 4, 8, 9). */
    const NON_RF = ['Capacity change', 'Other outcome', 'Other output', 'Impact contribution'];

    it('recognises the five RF result types and nothing else', () => {
      for (const name of STANDARD_RF_CATEGORIES) expect(isStandardRfCategory(name)).toBe(true);
      for (const name of NON_RF) expect(isStandardRfCategory(name)).toBe(false);
      expect(isStandardRfCategory('')).toBe(false);
      expect(isStandardRfCategory(null)).toBe(false);
      // Case- and whitespace-insensitive: the payload's casing must not decide this.
      expect(isStandardRfCategory('  knowledge PRODUCT ')).toBe(true);
    });

    it('offers only the RF categories present, in RF order, plus one Other bucket', () => {
      const present = ['Capacity change', 'Capacity sharing for development', 'Innovation development', 'Knowledge product', 'Other output'];

      expect(buildCategoryFilterOptions(present, null)).toEqual([
        { value: 'Innovation development', label: 'Innovation development' },
        { value: 'Knowledge product', label: 'Knowledge product' },
        { value: 'Capacity sharing for development', label: 'Capacity sharing for development' },
        { value: PROGRAMME_RESULTS_OTHER_CATEGORY, label: 'Other' }
      ]);
    });

    it('never lists a non-RF category as its own option', () => {
      const options = buildCategoryFilterOptions([...STANDARD_RF_CATEGORIES, ...NON_RF], null);
      for (const name of NON_RF) expect(options.some(option => option.value === name)).toBe(false);
      expect(options).toHaveLength(STANDARD_RF_CATEGORIES.length + 1);
    });

    it('omits the Other bucket when the programme reported RF categories only', () => {
      const options = buildCategoryFilterOptions(['Knowledge product', 'Policy change'], null);
      expect(options.some(option => option.value === PROGRAMME_RESULTS_OTHER_CATEGORY)).toBe(false);
      expect(options).toEqual([
        { value: 'Knowledge product', label: 'Knowledge product' },
        { value: 'Policy change', label: 'Policy change' }
      ]);
    });

    it('never offers a category no row actually has', () => {
      expect(buildCategoryFilterOptions(['Knowledge product'], null)).toEqual([{ value: 'Knowledge product', label: 'Knowledge product' }]);
      expect(buildCategoryFilterOptions([], null)).toEqual([]);
      expect(buildCategoryFilterOptions(null as unknown as string[], null)).toEqual([]);
    });

    it('keeps a deep-linked non-RF category selectable so the pill is not left blank', () => {
      // The Overview tab links here with an exact `category=<result_type>`, non-RF ones included.
      const options = buildCategoryFilterOptions(['Knowledge product', 'Other output'], 'Other output');
      expect(options).toEqual([
        { value: 'Knowledge product', label: 'Knowledge product' },
        { value: 'Other output', label: 'Other output' },
        { value: PROGRAMME_RESULTS_OTHER_CATEGORY, label: 'Other' }
      ]);
    });

    it('the Other bucket selects every non-RF row and no RF row', () => {
      for (const name of NON_RF) {
        expect(matchesProgrammeResultCategory(row({ category: name }), PROGRAMME_RESULTS_OTHER_CATEGORY)).toBe(true);
      }
      for (const name of STANDARD_RF_CATEGORIES) {
        expect(matchesProgrammeResultCategory(row({ category: name }), PROGRAMME_RESULTS_OTHER_CATEGORY)).toBe(false);
      }
    });

    it('still matches an exact category, and passes everything when nothing is picked', () => {
      expect(matchesProgrammeResultCategory(row({ category: 'Other output' }), 'Other output')).toBe(true);
      expect(matchesProgrammeResultCategory(row({ category: 'Other output' }), 'Knowledge product')).toBe(false);
      expect(matchesProgrammeResultCategory(row({ category: 'Other output' }), null)).toBe(true);
    });

    it('filters rows through the whole predicate when the bucket is selected', () => {
      const rows = [
        row({ code: '1', category: 'Knowledge product' }),
        row({ code: '2', category: 'Other output' }),
        row({ code: '3', category: 'Capacity change' })
      ];
      service.selectedCategory.set(PROGRAMME_RESULTS_OTHER_CATEGORY);

      expect(service.filterRows(rows).map(r => r.code)).toEqual(['2', '3']);
      expect(matchesProgrammeResultFilters(rows[0], service.state())).toBe(false);
    });

    it('labels the bucket chip "Other" instead of leaking the sentinel', () => {
      service.selectedCategory.set(PROGRAMME_RESULTS_OTHER_CATEGORY);

      expect(service.activeChips()).toEqual([{ label: 'Category: Other', dimension: 'category', value: PROGRAMME_RESULTS_OTHER_CATEGORY }]);
      service.clearChip(service.activeChips()[0]);
      expect(service.selectedCategory()).toBeNull();
    });
  });

  // CBF-T-1 — Created by dimension. Two-author + blank fixture is the CBF-R-1 evidence
  // (a presence-only assert on selectedCreatedBy is not behavioral proof).
  describe('Created by dimension (CBF-T-1)', () => {
    const authorRows = [
      row({ code: '1', createdBy: 'Angel Jarrin', statusName: 'Editing' }),
      row({ code: '2', createdBy: 'Angel Jarrin', statusName: 'Submitted' }),
      row({ code: '3', createdBy: 'Santiago Sanchez', statusName: 'Submitted' }),
      row({ code: '4', createdBy: '', statusName: 'Editing' })
    ];

    it('selecting a person leaves only that person’s rows and hides the blank-name row (CBF-R-1, CBF-AC-1)', () => {
      service.selectedCreatedBy.set('Angel Jarrin');

      expect(service.filterRows(authorRows).map(r => r.code)).toEqual(['1', '2']);
      expect(service.filterRows(authorRows).some(r => r.createdBy === 'Santiago Sanchez')).toBe(false);
      expect(service.filterRows(authorRows).some(r => !r.createdBy)).toBe(false);
    });

    it('matches Created by case-insensitively (CBF-R-1)', () => {
      service.selectedCreatedBy.set('angel jarrin');

      expect(service.filterRows(authorRows).map(r => r.code)).toEqual(['1', '2']);
    });

    it('AND-combines with Status and keeps both chips (CBF-R-1 combine)', () => {
      service.selectedCreatedBy.set('Angel Jarrin');
      service.selectedStatus.set('Submitted');

      expect(service.filterRows(authorRows).map(r => r.code)).toEqual(['2']);
      expect(service.activeChips()).toEqual([
        { label: 'Status: Submitted', dimension: 'status', value: 'Submitted' },
        { label: 'Created by: Angel Jarrin', dimension: 'createdBy', value: 'Angel Jarrin' }
      ]);
    });

    it('clearChip on Created by leaves Status set (CBF-R-2, CBF-AC-2)', () => {
      service.selectedCreatedBy.set('Angel Jarrin');
      service.selectedStatus.set('Submitted');

      const createdByChip = service.activeChips().find(chip => chip.dimension === 'createdBy')!;
      expect(createdByChip.label).toBe('Created by: Angel Jarrin');

      service.clearChip(createdByChip);

      expect(service.selectedCreatedBy()).toBeNull();
      expect(service.selectedStatus()).toBe('Submitted');
      expect(service.activeChips()).toEqual([{ label: 'Status: Submitted', dimension: 'status', value: 'Submitted' }]);
    });

    it('clearAll nulls Created by and Status (CBF-R-2)', () => {
      service.selectedCreatedBy.set('Angel Jarrin');
      service.selectedStatus.set('Submitted');

      service.clearAll();

      expect(service.selectedCreatedBy()).toBeNull();
      expect(service.selectedStatus()).toBeNull();
      expect(service.activeChips()).toEqual([]);
    });
  });
});
