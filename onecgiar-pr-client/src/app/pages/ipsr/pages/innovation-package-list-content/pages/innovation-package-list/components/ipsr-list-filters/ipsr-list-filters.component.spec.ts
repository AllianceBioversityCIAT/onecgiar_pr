import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { IpsrListFiltersComponent } from './ipsr-list-filters.component';
import { PrButtonComponent } from '../../../../../../../../custom-fields/pr-button/pr-button.component';
import { PrFilterMultiselectComponent } from '../../../../../../../../shared/components/pr-filter-multiselect/pr-filter-multiselect.component';
import { IpsrListFilterService } from '../../services/ipsr-list-filter.service';
import { IpsrListService } from '../../services/ipsr-list.service';
import { ExportTablesService } from '../../../../../../../../shared/services/export-tables.service';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { IpsrDataControlService } from '../../../../../../services/ipsr-data-control.service';
import { InnovationPackageListFilterPipe } from '../innovation-package-custom-table/pipes/innovation-package-list-filter.pipe';
import { of, throwError } from 'rxjs';

describe('IpsrListFiltersComponent', () => {
  let component: IpsrListFiltersComponent;
  let fixture: ComponentFixture<IpsrListFiltersComponent>;
  let ipsrListFilterSE: IpsrListFilterService;
  let ipsrDataControlSE: IpsrDataControlService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // `IpsrListFilterService` transitively depends on `PhasesService` -> `ResultsApiService`/
      // `HttpClient` since `IPSR-T-1` — `HttpClientTestingModule` is required here, not a sign of a
      // regression introduced by this task (flagged by `IPSR-T-1`'s Reviewer advisory).
      declarations: [IpsrListFiltersComponent, PrButtonComponent, PrFilterMultiselectComponent, InnovationPackageListFilterPipe],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [IpsrListFilterService, IpsrListService, ExportTablesService, ApiService, IpsrDataControlService]
    }).compileComponents();

    fixture = TestBed.createComponent(IpsrListFiltersComponent);
    component = fixture.componentInstance;
    ipsrListFilterSE = TestBed.inject(IpsrListFilterService);
    ipsrDataControlSE = TestBed.inject(IpsrDataControlService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('search input — preserved exactly (IPSR-R-5)', () => {
    it('binds to IpsrListService.text_to_search two-way', () => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="text"]');
      input.value = 'ABC-123';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.ipsrListService.text_to_search).toEqual('ABC-123');
    });
  });

  describe('Program filter — live apply (IPSR-R-1)', () => {
    it('selecting a Program option updates selectedPrograms() immediately, with no Apply step', () => {
      const programOption = { official_code: 'INIT-01', displayName: 'INIT-01 Some initiative' };
      ipsrListFilterSE.programOptions.set([programOption]);
      fixture.detectChanges();

      const multiselects = fixture.debugElement.queryAll(By.directive(PrFilterMultiselectComponent));
      const programMultiselect = multiselects[0].componentInstance as PrFilterMultiselectComponent;

      programMultiselect.toggle(programOption);
      fixture.detectChanges();

      expect(ipsrListFilterSE.selectedPrograms()).toEqual([programOption]);
    });

    it('selecting two Program options produces a chip pair (IPSR-AC-1)', () => {
      const initOne = { official_code: 'INIT-01', displayName: 'INIT-01 Some initiative' };
      const initTwo = { official_code: 'INIT-02', displayName: 'INIT-02 Another initiative' };

      ipsrListFilterSE.selectedPrograms.set([initOne, initTwo]);

      const submitterGroup = component.filterChipGroups().find(g => g.category === 'Submitter');

      expect(submitterGroup.chips.map(c => c.label)).toEqual(['INIT-01 Some initiative', 'INIT-02 Another initiative']);
    });
  });

  describe('Phase filter — multiselect, multiple simultaneous selections (IPSR-R-2)', () => {
    it('selecting a Phase option updates selectedPhases() immediately', () => {
      const phaseOption = { id: 1, attr: 'Phase 1', name: 'Phase 1 (Open)', selected: true };
      ipsrListFilterSE.phaseOptions.set([phaseOption]);
      fixture.detectChanges();

      const multiselects = fixture.debugElement.queryAll(By.directive(PrFilterMultiselectComponent));
      const phaseMultiselect = multiselects[1].componentInstance as PrFilterMultiselectComponent;

      phaseMultiselect.toggle(phaseOption);
      fixture.detectChanges();

      expect(ipsrListFilterSE.selectedPhases()).toEqual([phaseOption]);
    });

    it('allows multiple phases active simultaneously', () => {
      const phaseOne = { id: 1, attr: 'Phase 1', name: 'Phase 1 (Open)', selected: true };
      const phaseTwo = { id: 2, attr: 'Phase 2', name: 'Phase 2 (Closed)', selected: false };
      ipsrListFilterSE.phaseOptions.set([phaseOne, phaseTwo]);
      fixture.detectChanges();

      const multiselects = fixture.debugElement.queryAll(By.directive(PrFilterMultiselectComponent));
      const phaseMultiselect = multiselects[1].componentInstance as PrFilterMultiselectComponent;

      phaseMultiselect.toggle(phaseOne);
      phaseMultiselect.toggle(phaseTwo);
      fixture.detectChanges();

      expect(ipsrListFilterSE.selectedPhases()).toEqual([phaseOne, phaseTwo]);
    });
  });

  describe('Package status filter — live apply (IPSR-R-3)', () => {
    it('selecting a Status option updates selectedStatus() immediately', () => {
      ipsrListFilterSE.statusOptions.set(['Shared', 'Editing']);
      fixture.detectChanges();

      const multiselects = fixture.debugElement.queryAll(By.directive(PrFilterMultiselectComponent));
      const statusMultiselect = multiselects[2].componentInstance as PrFilterMultiselectComponent;

      statusMultiselect.toggle('Shared');
      fixture.detectChanges();

      expect(ipsrListFilterSE.selectedStatus()).toEqual(['Shared']);
    });
  });

  describe('onFilterSelectedInits / onFilterSelectedPhases — re-pointed at new signals (IPSR-T-1)', () => {
    it('onFilterSelectedInits returns the current selectedPrograms()', () => {
      const selected = [{ official_code: 'INIT-01', displayName: 'INIT-01' }];
      ipsrListFilterSE.selectedPrograms.set(selected);

      expect(component.onFilterSelectedInits()).toEqual(selected);
    });

    it('onFilterSelectedPhases returns the current selectedPhases()', () => {
      const selected = [{ id: 1, attr: 'Phase 1', name: 'Phase 1 (Open)', selected: true }];
      ipsrListFilterSE.selectedPhases.set(selected);

      expect(component.onFilterSelectedPhases()).toEqual(selected);
    });
  });

  describe('onDownLoadTableAsExcel', () => {
    const wscols = [
      { header: 'Result code', key: 'result_code', width: 13 },
      { header: 'Reporting phase', key: 'phase_name', width: 17.5 },
      { header: 'Reporting year', key: 'reporting_year', width: 16.5 },
      { header: 'Result title', key: 'result_title', width: 115.83 },
      { header: 'Result type', key: 'result_type', width: 21 },
      { header: 'Core innovation', key: 'core_innovation', width: 65.83 },
      { header: 'Link - core innovation', key: 'link_core_innovation', width: 75.33 },
      { header: 'Geofocus', key: 'geo_focus', width: 48.33 },
      { header: 'Submitter', key: 'submitted_by', width: 15.83 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Gender tag level', key: 'gender_tag_level', width: 17.17 },
      { header: 'Climate change tag level', key: 'climate_change_tag_level', width: 25.17 },
      { header: 'Nutrition tag level', key: 'nutrition_tag_level', width: 19.17 },
      { header: 'Environment AND/or biodiversity tag Level', key: 'environmental_biodiversity_tag_level', width: 44.83 },
      { header: 'Poverty tag level', key: 'poverty_tag_level', width: 17.5 },
      { header: 'Creation date', key: 'creation_date', width: 14.33 },
      { header: 'Lead initiative', key: 'lead_initiative', width: 92.17 },
      { header: 'Contributing initiative(s)', key: 'contributing_initiatives', width: 32.5 },
      { header: 'Scaling ambition', key: 'scaling_ambition', width: 65.67 },
      { header: 'Sustainable Development Goals (SDGs) targetted', key: 'sdg_targets', width: 50.67 },
      { header: 'Scaling Readiness score', key: 'scalability_potential_score_min', width: 23.83 },
      { header: 'Scalability potential score', key: 'scalability_potential_score_avg', width: 26.33 },
      { header: 'Link to IPSR metadata PDF report', key: 'link_to_pdf', width: 59 }
    ];

    it('calls exportExcel and sets isLoadingReport to false when it succeeds', () => {
      const inits = [{ official_code: 'INIT-01' }];
      const phases = [{ attr: 'Phase 1' }];
      const searchText = 'example';

      const exportTablesServiceSpy = jest
        .spyOn(TestBed.inject(ExportTablesService), 'exportExcelIpsr')
        .mockImplementation(async () => {});
      const apiServiceSpy = jest
        .spyOn(TestBed.inject(ApiService).resultsSE, 'GET_reportingList')
        .mockReturnValue(of({ response: { response: [] } }) as any);

      component.onDownLoadTableAsExcel(inits, phases, searchText);

      expect(exportTablesServiceSpy).toHaveBeenCalledWith([], 'IPSR_results_list', wscols, undefined, true);
      expect(component.isLoadingReport).toBeFalsy();
      expect(apiServiceSpy).toHaveBeenCalledWith({ inits, phases, searchText });
    });

    it('logs the error and sets isLoadingReport to false when it fails', () => {
      const inits = [{ official_code: 'INIT-01' }];
      const phases = [{ attr: 'Phase 1' }];
      const searchText = 'example';

      const consoleErrorSpy = jest.spyOn(console, 'error');
      const apiServiceSpy = jest.spyOn(TestBed.inject(ApiService).resultsSE, 'GET_reportingList').mockReturnValue(
        throwError(() => {
          console.error('error');
        })
      );

      component.onDownLoadTableAsExcel(inits, phases, searchText);

      expect(consoleErrorSpy).toHaveBeenCalledWith('error');
      expect(component.isLoadingReport).toBeFalsy();
      expect(apiServiceSpy).toHaveBeenCalledWith({ inits, phases, searchText });
    });
  });

  describe('Download button visibility — filtered/searched result count (IPSR-R-6, IPSR-AC-8)', () => {
    it('hides Download when the unfiltered list is empty', () => {
      ipsrDataControlSE.ipsrResultList = [];
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.directive(PrButtonComponent))).toBeNull();
    });

    it('shows Download when the unfiltered list has rows and no search/filter is active', () => {
      ipsrDataControlSE.ipsrResultList = [{ result_code: '1', full_name: '1 Title 1 OC1' }];
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.directive(PrButtonComponent))).not.toBeNull();
    });

    it('search matches nothing -> button hidden, even though the unfiltered list has rows', () => {
      ipsrDataControlSE.ipsrResultList = [{ result_code: '1', full_name: '1 Title 1 OC1' }];
      component.ipsrListService.text_to_search = 'no-such-match';
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.directive(PrButtonComponent))).toBeNull();
    });

    it('shows Download when the search matches at least one row in a non-empty unfiltered list', () => {
      ipsrDataControlSE.ipsrResultList = [
        { result_code: '1', full_name: '1 Title 1 OC1' },
        { result_code: '2', full_name: '2 Title 2 OC2' }
      ];
      component.ipsrListService.text_to_search = 'Title 1';
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.directive(PrButtonComponent))).not.toBeNull();
    });

    it('hides Download when a Program/Phase/Status/Portfolio facet filters out every row, even unsearched', () => {
      ipsrDataControlSE.ipsrResultList = [{ result_code: '1', full_name: '1 Title 1 OC1', status: 'Shared' }];
      ipsrListFilterSE.selectedStatus.set(['Editing']);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.directive(PrButtonComponent))).toBeNull();
    });
  });

  describe('Download button — composes onFilterSelectedInits() + onFilterSelectedPhases() + text_to_search on click (IPSR-AC-8)', () => {
    it('clicking the real Download button passes the composed selected Program/Phase filters and search text through to GET_reportingList', () => {
      const selectedPrograms = [{ official_code: 'INIT-01', displayName: 'INIT-01' }];
      const selectedPhases = [{ id: 1, attr: 'Phase 1', name: 'Phase 1 (Open)' }];

      // The row must actually match both selected facets, or `innovationPackageListFilter` filters
      // it out before the Download button's visibility gate is evaluated (IPSR-R-6/IPSR-T-3).
      ipsrDataControlSE.ipsrResultList = [
        { result_code: '1', full_name: '1 Title 1 OC1', official_code: 'INIT-01', phase_name: 'Phase 1' }
      ];
      ipsrListFilterSE.selectedPrograms.set(selectedPrograms);
      ipsrListFilterSE.selectedPhases.set(selectedPhases);
      component.ipsrListService.text_to_search = 'Title 1';
      fixture.detectChanges();

      jest.spyOn(TestBed.inject(ExportTablesService), 'exportExcelIpsr').mockImplementation(async () => {});
      const apiServiceSpy = jest
        .spyOn(TestBed.inject(ApiService).resultsSE, 'GET_reportingList')
        .mockReturnValue(of({ response: { response: [] } }) as any);

      const downloadButton = fixture.debugElement.query(By.directive(PrButtonComponent));
      expect(downloadButton).not.toBeNull();
      downloadButton.nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(apiServiceSpy).toHaveBeenCalledWith({
        inits: selectedPrograms,
        phases: selectedPhases,
        searchText: 'Title 1'
      });
    });
  });

  describe('loadSecondaryFacetOptions wiring (ngOnInit) — closes IPSR-T-2 forward pointer', () => {
    it('calls IpsrListFilterService.loadSecondaryFacetOptions() from ngOnInit, populating Portfolio options', () => {
      // Fresh TestBed instance so the spy is attached BEFORE this component's own ngOnInit runs
      // (the outer beforeEach's fixture already triggered ngOnInit on a different instance).
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        declarations: [IpsrListFiltersComponent, PrButtonComponent, PrFilterMultiselectComponent, InnovationPackageListFilterPipe],
        imports: [HttpClientTestingModule, FormsModule],
        providers: [IpsrListFilterService, IpsrListService, ExportTablesService, ApiService, IpsrDataControlService]
      });

      const freshFilterSE = TestBed.inject(IpsrListFilterService);
      const loadSpy = jest.spyOn(freshFilterSE, 'loadSecondaryFacetOptions');
      const httpMock = TestBed.inject(HttpTestingController);

      const freshFixture = TestBed.createComponent(IpsrListFiltersComponent);
      freshFixture.detectChanges();

      expect(loadSpy).toHaveBeenCalledTimes(1);

      // The service (rewired by a concurrent sibling dispatch) may still issue a Center catalog
      // request underneath `loadSecondaryFacetOptions()` — this component doesn't read/render
      // Center at all (`IPSR-DD-3`, revised), so any such request is drained here only to keep
      // `HttpTestingController.verify()` from failing on an unflushed request, not asserted on.
      const pendingCenterReq = httpMock.match(req => req.url.endsWith('clarisa/centers/get/all'));
      pendingCenterReq.forEach(req => req.flush({ response: [] }));

      const portfolios = [{ id: 1, name: 'Portfolio A' }];
      httpMock.expectOne(req => req.url.endsWith('clarisa/portfolios')).flush(portfolios);

      expect(freshFilterSE.portfolioOptions()).toEqual(portfolios);
    });
  });

  describe('"More filters" popover — open/apply/cancel (IPSR-T-5, design.md §2.3, Portfolio-only)', () => {
    /** Clicks the REAL "More filters" trigger button, mirroring an actual user interaction. */
    function clickTrigger(): void {
      fixture.debugElement.query(By.css('[data-testid="ip-more-filters-trigger"]')).nativeElement.click();
      fixture.detectChanges();
    }

    it('opening the popover seeds temp* from the current selected*, not a stale prior edit', () => {
      const selectedPortfolios = [{ id: 1, name: 'Portfolio A' }];
      ipsrListFilterSE.selectedPortfolios.set(selectedPortfolios);
      // Simulate a stale temp value left over from a prior cancelled edit.
      ipsrListFilterSE.tempSelectedPortfolios.set([{ id: 99, name: 'STALE' }]);

      clickTrigger();

      expect(component.moreFiltersOpen()).toBe(true);
      expect(ipsrListFilterSE.tempSelectedPortfolios()).toEqual(selectedPortfolios);
    });

    it('Apply commits temp* into selected* and closes the popover', () => {
      const selectedPortfolios = [{ id: 1, name: 'Portfolio A' }];
      const newPortfolios = [{ id: 2, name: 'Portfolio B' }];
      ipsrListFilterSE.selectedPortfolios.set(selectedPortfolios);

      clickTrigger();
      ipsrListFilterSE.tempSelectedPortfolios.set(newPortfolios);

      component.applyFilters();

      expect(ipsrListFilterSE.selectedPortfolios()).toEqual(newPortfolios);
      expect(component.moreFiltersOpen()).toBe(false);
    });

    it('Cancel button discards the temp edit — selected* is unchanged after opening, editing, then cancelling', () => {
      const selectedPortfolios = [{ id: 1, name: 'Portfolio A' }];
      ipsrListFilterSE.selectedPortfolios.set(selectedPortfolios);

      clickTrigger();
      ipsrListFilterSE.tempSelectedPortfolios.set([{ id: 2, name: 'Portfolio B' }]);

      component.cancelFilters();

      expect(ipsrListFilterSE.selectedPortfolios()).toEqual(selectedPortfolios);
      expect(ipsrListFilterSE.tempSelectedPortfolios()).toEqual(selectedPortfolios);
      expect(component.moreFiltersOpen()).toBe(false);
    });

    it('a single real outside-document click closes the popover on the FIRST click and discards the temp edit', () => {
      // Regression for the outside-click bug: `toggleMoreFilters()`'s own `stopPropagation()` on
      // the trigger click never reaches `document:click`, so a leftover `skipNextDocClick` guard
      // used to eat the FIRST outside click instead of the (nonexistent) opening one, requiring a
      // second click to actually close the popover. Opens via the real trigger button and closes
      // via a real dispatched `document` click — no private-state manipulation.
      const selectedPortfolios = [{ id: 1, name: 'Portfolio A' }];
      ipsrListFilterSE.selectedPortfolios.set(selectedPortfolios);

      clickTrigger();
      expect(component.moreFiltersOpen()).toBe(true);

      ipsrListFilterSE.tempSelectedPortfolios.set([{ id: 2, name: 'Portfolio B' }]);

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(component.moreFiltersOpen()).toBe(false);
      expect(ipsrListFilterSE.selectedPortfolios()).toEqual(selectedPortfolios);
    });

    it('Escape discards the temp edit — a real dispatched keydown event closes the popover', () => {
      const selectedPortfolios = [{ id: 1, name: 'Portfolio A' }];
      ipsrListFilterSE.selectedPortfolios.set(selectedPortfolios);

      clickTrigger();
      ipsrListFilterSE.tempSelectedPortfolios.set([{ id: 2, name: 'Portfolio B' }]);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();

      expect(ipsrListFilterSE.selectedPortfolios()).toEqual(selectedPortfolios);
      expect(ipsrListFilterSE.tempSelectedPortfolios()).toEqual(selectedPortfolios);
      expect(component.moreFiltersOpen()).toBe(false);
    });

    it('renders the Portfolio-only popover fields while open, with no Center field', () => {
      expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

      clickTrigger();

      const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
      expect(dialog).not.toBeNull();
      expect(dialog.textContent).toContain('Portfolio');
      expect(dialog.textContent).not.toContain('Center');
    });
  });

  describe('filterChipGroups — one group per active facet (IPSR-R-4)', () => {
    it('produces a chip group per non-empty facet, none for empty ones, and no Center group', () => {
      ipsrListFilterSE.selectedPrograms.set([{ official_code: 'INIT-01', displayName: 'INIT-01 Some initiative' }]);
      ipsrListFilterSE.selectedPhases.set([{ id: 1, name: 'Phase 1 (Open)' }]);
      ipsrListFilterSE.selectedStatus.set(['Editing']);
      ipsrListFilterSE.selectedPortfolios.set([{ id: 1, name: 'Portfolio A' }]);

      const categories = component.filterChipGroups().map(g => g.category);

      expect(categories).toEqual(['Submitter', 'Phase', 'Package status', 'Portfolio']);
      expect(categories).not.toContain('Center');
    });

    it('is empty when no facet has an active selection', () => {
      expect(component.filterChipGroups()).toEqual([]);
    });
  });

  describe('removeFilter — clears only the matching facet, others stay untouched (IPSR-AC-4)', () => {
    function seedAllFacets() {
      ipsrListFilterSE.selectedPrograms.set([{ official_code: 'INIT-01', displayName: 'INIT-01' }]);
      ipsrListFilterSE.selectedPhases.set([{ id: 1, name: 'Phase 1 (Open)' }]);
      ipsrListFilterSE.selectedStatus.set(['Editing']);
      ipsrListFilterSE.selectedPortfolios.set([{ id: 1, name: 'Portfolio A' }]);
    }

    it('removing the Program chip clears only selectedPrograms', () => {
      seedAllFacets();
      const [chip] = component.filterChipGroups().find(g => g.category === 'Submitter').chips;

      component.removeFilter(chip);

      expect(ipsrListFilterSE.selectedPrograms()).toEqual([]);
      expect(ipsrListFilterSE.selectedPhases().length).toBe(1);
      expect(ipsrListFilterSE.selectedStatus().length).toBe(1);
      expect(ipsrListFilterSE.selectedPortfolios().length).toBe(1);
    });

    it('removing the Phase chip clears only selectedPhases', () => {
      seedAllFacets();
      const [chip] = component.filterChipGroups().find(g => g.category === 'Phase').chips;

      component.removeFilter(chip);

      expect(ipsrListFilterSE.selectedPhases()).toEqual([]);
      expect(ipsrListFilterSE.selectedPrograms().length).toBe(1);
      expect(ipsrListFilterSE.selectedStatus().length).toBe(1);
      expect(ipsrListFilterSE.selectedPortfolios().length).toBe(1);
    });

    it('removing the Package status chip clears only selectedStatus', () => {
      seedAllFacets();
      const [chip] = component.filterChipGroups().find(g => g.category === 'Package status').chips;

      component.removeFilter(chip);

      expect(ipsrListFilterSE.selectedStatus()).toEqual([]);
      expect(ipsrListFilterSE.selectedPrograms().length).toBe(1);
      expect(ipsrListFilterSE.selectedPhases().length).toBe(1);
      expect(ipsrListFilterSE.selectedPortfolios().length).toBe(1);
    });

    it('removing the Portfolio chip clears only selectedPortfolios', () => {
      seedAllFacets();
      const [chip] = component.filterChipGroups().find(g => g.category === 'Portfolio').chips;

      component.removeFilter(chip);

      expect(ipsrListFilterSE.selectedPortfolios()).toEqual([]);
      expect(ipsrListFilterSE.selectedPrograms().length).toBe(1);
      expect(ipsrListFilterSE.selectedPhases().length).toBe(1);
      expect(ipsrListFilterSE.selectedStatus().length).toBe(1);
    });
  });

  describe('clearAllNewFilters — resets every facet including Portfolio, closes the popover (IPSR-AC-5)', () => {
    it('resets every selected* and temp* signal and closes an open popover', () => {
      ipsrListFilterSE.selectedPrograms.set([{ official_code: 'INIT-01' }]);
      ipsrListFilterSE.selectedPhases.set([{ id: 1 }]);
      ipsrListFilterSE.selectedStatus.set(['Editing']);
      ipsrListFilterSE.selectedPortfolios.set([{ id: 1 }]);
      ipsrListFilterSE.tempSelectedPortfolios.set([{ id: 2 }]);
      component.toggleMoreFilters();

      component.clearAllNewFilters();

      expect(ipsrListFilterSE.selectedPrograms()).toEqual([]);
      expect(ipsrListFilterSE.selectedPhases()).toEqual([]);
      expect(ipsrListFilterSE.selectedStatus()).toEqual([]);
      expect(ipsrListFilterSE.selectedPortfolios()).toEqual([]);
      expect(ipsrListFilterSE.tempSelectedPortfolios()).toEqual([]);
      expect(component.moreFiltersOpen()).toBe(false);
    });
  });
});
