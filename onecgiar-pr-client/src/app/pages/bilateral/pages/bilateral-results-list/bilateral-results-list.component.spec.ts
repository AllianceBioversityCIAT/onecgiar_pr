import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Params, Router, RouterModule } from '@angular/router';
import { BehaviorSubject, map, of } from 'rxjs';
import { signal } from '@angular/core';
import {
  BilateralResultsListComponent,
  BilateralCenterResult,
  BILATERAL_COLUMNS,
} from './bilateral-results-list.component';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';
import { BilateralContextService } from '../../services/bilateral-context.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { ResultsApiService } from '../../../../shared/services/api/results-api.service';
import { Clipboard } from '@angular/cdk/clipboard';
import { PrToastService } from '../../../../shared/components/pr-toast';
import { ResultDeletionService } from '../../../result-framework-reporting/services/result-deletion.service';

describe('BilateralResultsListComponent', () => {
  let component: BilateralResultsListComponent;
  let fixture: ComponentFixture<BilateralResultsListComponent>;
  let bilateralApiService: any;
  let phasesService: any;
  let rolesService: any;
  let router: Router;
  let navigateSpy: jest.SpyInstance;

  /**
   * `COV-T-7` / `COV-R-14` — the Results tab now READS and WRITES the shared query-param contract,
   * so the spec drives it through a real URL round-trip instead of a one-way spy: the route's
   * `queryParamMap` (and its `snapshot`, which `?result=` reads) is backed by a subject, and
   * `Router.navigate` applies the same `merge` semantics the real router applies (a `null` value
   * deletes the key) before feeding the result back into that subject.
   *
   * The feedback leg is the point. Without it a spec can assert what the component wrote but never
   * what the re-hydration then does to it — which is how the multi-word search regression (every
   * keystroke round-tripping through a `search` value the parser trims) stayed invisible behind a
   * green suite.
   */
  let queryParams$: BehaviorSubject<Params>;

  /** Re-creates the component on a given URL — the only way to exercise `ngOnInit`'s snapshot read
   *  (`?result=`) and the init-time hydration. Destroys the previous fixture first so its still-live
   *  `queryParamMap` subscription cannot answer the new params too. */
  const recreateOn = (params: Params = {}) => {
    fixture.destroy();
    navigateSpy.mockClear();
    queryParams$.next({ ...params });
    fixture = TestBed.createComponent(BilateralResultsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Second pass: the rows arrive from the (synchronous) API mock during the first flush.
    fixture.detectChanges();
  };

  const chipTexts = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.pr-chip.brl-chip') as NodeListOf<HTMLElement>).map(
      chip => (chip.textContent ?? '').replace(/\s+/g, ' ').trim(),
    );

  const chipRemoveButton = (labelPart: string): HTMLButtonElement | undefined => {
    const chip = Array.from(
      fixture.nativeElement.querySelectorAll('.pr-chip.brl-chip') as NodeListOf<HTMLElement>,
    ).find(el => (el.textContent ?? '').includes(labelPart));
    return chip?.querySelector('button.brl-chip-remove') as HTMLButtonElement | undefined;
  };

  const result = (overrides: Partial<BilateralCenterResult> = {}): BilateralCenterResult => ({
    id: 1,
    result_code: '8706',
    title: 'Kenya County Climate Risk Profiles',
    result_type: 'Other output',
    status_id: 1,
    status_name: 'Editing',
    created_date: '2026-07-30T00:00:00.000Z',
    version_id: 36,
    source: 'API',
    is_leading_result: 1,
    description: 'Profiles co-developed with the county governments of Kenya.',
    project_name: 'Accelerating Impacts of CGIAR Climate Research for Africa',
    ...overrides,
  });

  beforeEach(async () => {
    localStorage.clear();
    queryParams$ = new BehaviorSubject<Params>({});

    bilateralApiService = {
      GET_bilateralCenterResults: jest.fn().mockReturnValue(of({ response: [result()] })),
    };
    phasesService = {
      // `COV-R-2` C / HITL H-2 — `GET /api/versioning` delivers `id` as a STRING (`'36'`), although
      // `Phases` types it `number`. The fixtures keep the API's real shape so the component has to
      // normalize before comparing it with the numeric shared phase signal.
      phases: { reporting: [{ id: '36', phase_year: 2026, status: true, obj_portfolio: { acronym: 'P25' } }] },
      getPhasesObservable: jest.fn().mockReturnValue(of([])),
    };
    rolesService = {
      isAdmin: true,
      getMyCenters: jest.fn().mockReturnValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralResultsListComponent, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BilateralApiService, useValue: bilateralApiService },
        { provide: PhasesService, useValue: phasesService },
        { provide: RolesService, useValue: rolesService },
        ResultsApiService,
      ],
    }).compileComponents();

    // The real `ActivatedRoute` is kept (RouterLink in the page header resolves through it) — only
    // the query-param plumbing is swapped for the subject, on the instance and on its snapshot.
    const activatedRoute = TestBed.inject(ActivatedRoute);
    Object.defineProperty(activatedRoute, 'queryParams', {
      configurable: true,
      value: queryParams$.asObservable(),
    });
    Object.defineProperty(activatedRoute, 'queryParamMap', {
      configurable: true,
      value: queryParams$.pipe(map(params => convertToParamMap(params))),
    });
    Object.defineProperty(activatedRoute.snapshot, 'queryParams', {
      configurable: true,
      get: () => queryParams$.value,
    });
    Object.defineProperty(activatedRoute.snapshot, 'queryParamMap', {
      configurable: true,
      get: () => convertToParamMap(queryParams$.value),
    });

    router = TestBed.inject(Router);
    navigateSpy = jest.spyOn(router, 'navigate').mockImplementation((commands: any[], extras?: any) => {
      // Only the component's own `navigate([], { queryParams, … })` writes are replayed into the
      // URL; `openResult` navigates to a path and is merely recorded, as before.
      if (commands.length === 0 && extras?.queryParams) {
        const next: Params = extras.queryParamsHandling === 'merge' ? { ...queryParams$.value } : {};
        for (const [key, value] of Object.entries(extras.queryParams as Params)) {
          if (value === null || value === undefined) delete next[key];
          else next[key] = String(value);
        }
        // The real router settles a navigation asynchronously: the `queryParamMap` emission lands
        // AFTER the change-detection pass that already pushed the typed value into the input. The
        // microtask preserves that ordering, and that ordering is what makes a hydration that
        // clobbers the field observable in the DOM instead of only in the signal.
        return Promise.resolve().then(() => {
          queryParams$.next(next);
          return true;
        });
      }
      return Promise.resolve(true);
    });

    fixture = TestBed.createComponent(BilateralResultsListComponent);
    component = fixture.componentInstance;

    const ctx = TestBed.inject(BilateralContextService);
    ctx.setCenter('Bioversity (Alliance)', 'Alliance of Bioversity and CIAT', 'CIAT-BIOVERSITY');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads results for the active phase once the center resolves', () => {
    expect(bilateralApiService.GET_bilateralCenterResults).toHaveBeenCalledWith('CIAT-BIOVERSITY', 36);
    expect(component.results().length).toBe(1);
    expect(component.visibleColumns().find(c => c.attr === 'result_type')).toEqual(
      expect.objectContaining({ title: 'Result type' }),
    );
  });

  describe('column visibility', () => {
    it('starts with every column visible', () => {
      expect(component.visibleColumns().map(c => c.key)).toEqual(BILATERAL_COLUMNS.map(c => c.key));
    });

    it('hides a column when toggled off and persists the choice', () => {
      component.toggleColumn('type');
      expect(component.isColumnVisible('type')).toBe(false);
      expect(component.visibleColumns().find(c => c.key === 'type')).toBeUndefined();

      const stored = JSON.parse(localStorage.getItem('pr.bilateralResults.visibleColumns.v3') ?? '{}');
      expect(stored.type).toBe(false);
    });

    it('refuses to hide the last remaining visible column', () => {
      for (const col of BILATERAL_COLUMNS.slice(1)) {
        component.toggleColumn(col.key);
      }
      expect(component.visibleColumns().length).toBe(1);

      component.toggleColumn(BILATERAL_COLUMNS[0].key);
      expect(component.visibleColumns().length).toBe(1);
    });
  });

  /**
   * P2-3152 AC6 — the centre dashboard must list Project name and Description next to
   * Title and Status. Both were absent from BILATERAL_COLUMNS and from the payload, so
   * the row rendered without them. Asserting on the rendered cells (not on the column
   * catalog alone) is deliberate: with zoneless change detection a catalog-only check
   * would pass even if the template never grew a branch for the new attributes.
   */
  describe('P2-3152 AC6 — Project name and Description columns', () => {
    const cellText = (attr: string): string | null => {
      const cell = fixture.nativeElement.querySelector(`td.rc-td--${attr}`);
      return cell ? cell.textContent.trim() : null;
    };

    it('offers both columns, visible by default', () => {
      const keys = component.visibleColumns().map(c => c.key);
      expect(keys).toContain('project');
      expect(keys).toContain('description');
      expect(BILATERAL_COLUMNS.find(c => c.key === 'project')).toEqual(
        expect.objectContaining({ title: 'Project name', attr: 'project_name', defaultOn: true }),
      );
      expect(BILATERAL_COLUMNS.find(c => c.key === 'description')).toEqual(
        expect.objectContaining({ title: 'Description', attr: 'description', defaultOn: true }),
      );
    });

    it('renders the project name and the description in the row', () => {
      expect(cellText('project_name')).toBe('Accelerating Impacts of CGIAR Climate Research for Africa');
      expect(cellText('description')).toBe('Profiles co-developed with the county governments of Kenya.');
    });

    it('falls back to a dash when the result has no project or description', () => {
      component.results.set([result({ project_name: null, description: null })]);
      fixture.detectChanges();

      expect(cellText('project_name')).toBe('-');
      expect(cellText('description')).toBe('-');
    });

    // `cellText` is what the CSV export writes for each visible column; without a case for the
    // new attributes it silently returned '' and the export shipped two empty columns.
    it('carries both fields into the CSV export', () => {
      const row = result();
      const text = (attr: string) => (component as any).cellText(row, attr);

      expect(text('project_name')).toBe('Accelerating Impacts of CGIAR Climate Research for Africa');
      expect(text('description')).toBe('Profiles co-developed with the county governments of Kenya.');
      expect((component as any).cellText(result({ project_name: null, description: null }), 'project_name')).toBe('');
    });
  });

  describe('statusClass', () => {
    it('maps a status id to the Results Center status_tag classes', () => {
      expect(component.statusClass(6)).toBe('status_tag status_6');
    });
  });

  describe('exportCsv', () => {
    let createObjectURL: jest.Mock;
    let revokeObjectURL: jest.Mock;

    beforeEach(() => {
      createObjectURL = jest.fn().mockReturnValue('blob:mock');
      revokeObjectURL = jest.fn();
      (URL as any).createObjectURL = createObjectURL;
      (URL as any).revokeObjectURL = revokeObjectURL;
    });

    it('builds and downloads a CSV without throwing', () => {
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      expect(() => component.exportCsv()).not.toThrow();

      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

      clickSpy.mockRestore();
    });
  });

  describe('filteredResults', () => {
    it('filters by source and role chips', () => {
      component.results.set([
        result({ id: 1, source: 'API', is_leading_result: 1 }),
        result({ id: 2, source: 'Result', is_leading_result: 0 }),
      ]);

      expect(component.filteredResults().map(r => r.id)).toEqual([1]);

      component.toggleContributing();
      expect(component.filteredResults().map(r => r.id).sort()).toEqual([1]);

      component.toggleW1W2();
      expect(component.filteredResults().map(r => r.id).sort()).toEqual([1, 2]);
    });
  });

  /**
   * `COV-R-14`/`COV-DD-3` (amendment) — the URL write path. Two things have to hold at once:
   * an explicit "both/both" selection must survive a reload (so it is written as the additive
   * `all` token, not omitted — an omitted role/source re-triggers `applyResultsTabDefaults` and
   * silently snaps the user back to W3 + Lead), and a plain `/results` load must write nothing
   * at all (hydration is not a user change).
   */
  describe('COV-DD-3 amendment — URL round-trip of an explicit "both" scope', () => {
    it('writes source=all&role=all once all four chips are on', () => {
      component.toggleW1W2();
      component.toggleContributing();

      expect(component.showW3()).toBe(true);
      expect(component.showW1W2()).toBe(true);
      expect(component.showLead()).toBe(true);
      expect(component.showContributing()).toBe(true);

      expect(navigateSpy).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({
          queryParams: expect.objectContaining({ source: 'all', role: 'all' }),
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );
    });

    it('writes nothing to the URL on a plain /results load with no params', () => {
      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  /**
   * `COV-R-14` / `COV-AC-18` — the read side of the contract. Every case here drives the component
   * through the route subject (see the harness above), so what is asserted is what a real deep link,
   * a back/forward step or the component's own write-back actually produces.
   */
  describe('COV-R-14 — hydrating the Results tab from the URL', () => {
    it('shows only matching rows and one removable chip per param for ?status=pending&project=118 (COV-AC-18)', fakeAsync(() => {
      bilateralApiService.GET_bilateralCenterResults.mockReturnValue(
        of({
          response: [
            result({ id: 1, result_code: '1', status_id: 5, status_name: 'Pending review', project_id: 118, project_name: 'Rice for Africa' }),
            result({ id: 2, result_code: '2', status_id: 1, status_name: 'Editing', project_id: 118, project_name: 'Rice for Africa' }),
            result({ id: 3, result_code: '3', status_id: 5, status_name: 'Pending review', project_id: 204 }),
            result({ id: 4, result_code: '4', status_id: 5, status_name: 'Pending review', project_id: null }),
          ],
        }),
      );

      recreateOn({ status: 'pending', project: '118' });

      expect(component.statusFilter()).toEqual(['pending']);
      expect(component.projectFilter()).toEqual([118]);
      expect(component.filteredResults().map(r => r.id)).toEqual([1]);

      // Both chips are rendered with dimension labels, using the project's real name rather than its id.
      expect(chipTexts().some(text => text.includes('Status: Pending review'))).toBe(true);
      expect(chipTexts().some(text => text.includes('Project: Rice for Africa'))).toBe(true);

      // …and both are removable: clicking one drops its param from the URL and its chip from the strip.
      chipRemoveButton('Project: Rice for Africa')!.click();
      tick();
      fixture.detectChanges();

      expect(component.projectFilter()).toEqual([]);
      expect('project' in queryParams$.value).toBe(false);
      expect(chipTexts().some(text => text.includes('Project: Rice for Africa'))).toBe(false);
      expect(component.filteredResults().map(r => r.id)).toEqual([1, 3, 4]);

      chipRemoveButton('Status: Pending review')!.click();
      tick();
      fixture.detectChanges();

      expect(component.statusFilter()).toEqual([]);
      expect('status' in queryParams$.value).toBe(false);
      expect(chipTexts().some(text => text.includes('Status: Pending review'))).toBe(false);
    }));

    it('strips an invalid status token from the URL exactly once, keeping the valid ones', fakeAsync(() => {
      recreateOn({ status: 'bogus,pending' });
      tick();

      expect(component.statusFilter()).toEqual(['pending']);
      expect(navigateSpy).toHaveBeenCalledTimes(1);
      expect(navigateSpy).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { status: 'pending' },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );
      // The rewritten URL re-enters `applyUrlParams`; it must settle there, not rewrite itself again.
      expect(queryParams$.value).toEqual({ status: 'pending' });
    }));

    it('takes the phase from the shared signal instead of the Open phase', () => {
      phasesService.phases.reporting = [
        { id: '35', phase_year: 2025, status: false, obj_portfolio: { acronym: 'P25' } },
        { id: '36', phase_year: 2026, status: true, obj_portfolio: { acronym: 'P25' } },
      ];
      TestBed.inject(BilateralContextService).selectedVersionId.set(35);

      recreateOn();

      expect(component.selectedPhase()?.phase_year).toBe(2025);
      expect(bilateralApiService.GET_bilateralCenterResults).toHaveBeenLastCalledWith('CIAT-BIOVERSITY', 35);
    });

    /** `COV-R-5` A — the shared signal the other tabs read must be a NUMBER, not the API's string. */
    it('writes a numeric phase id to the shared signal when a phase filter chip is picked', () => {
      phasesService.phases.reporting = [
        { id: '35', phase_year: 2025, status: false, obj_portfolio: { acronym: 'P25' } },
        { id: '36', phase_year: 2026, status: true, obj_portfolio: { acronym: 'P25' } },
      ];
      recreateOn();

      // `phases` keeps the service's order, so index 0 is the CLOSED 2025 phase.
      component.togglePhase(component.phases()[0]);
      fixture.detectChanges();

      expect(component.selectedPhaseIds()).toEqual([35, 36]);
      expect(TestBed.inject(BilateralContextService).selectedVersionId()).toBe(36);
      expect(bilateralApiService.GET_bilateralCenterResults).toHaveBeenCalledWith('CIAT-BIOVERSITY', 35);
      expect(bilateralApiService.GET_bilateralCenterResults).toHaveBeenCalledWith('CIAT-BIOVERSITY', 36);
    });

    it('still focuses the row deep-linked by ?result=, and leaves that param alone', () => {
      recreateOn({ result: '8706' });

      expect(component.focusedResultCode()).toBe('8706');
      expect(fixture.nativeElement.querySelector('tr.rc-row--focused')).toBeTruthy();
      // `?result=` is neither a contract key nor a managed one: it is not stripped, and its presence
      // must not suppress the no-param W3 + Lead default.
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(component.showW3()).toBe(true);
      expect(component.showW1W2()).toBe(false);
      expect(component.showLead()).toBe(true);
      expect(component.showContributing()).toBe(false);
    });

    it('hydrates the search box from a deep link', () => {
      recreateOn({ search: 'kenya' });

      expect(component.searchQuery()).toBe('kenya');
      expect((fixture.nativeElement.querySelector('input[aria-label="Search results"]') as HTMLInputElement).value).toBe('kenya');
    });
  });

  /**
   * `COV-R-13` BUT — the regression this file could not see before: `onSearch` writes every keystroke
   * to the URL and the same component re-hydrates from it, while `parseBilateralQueryParams` trims
   * `search`. Hydrating unconditionally ate the space of a two-word query (`foo ` → `foo` → next key
   * `foob`), putting token search out of reach. These cases type through the real input and let the
   * (simulated) navigation complete before asserting.
   */
  describe('COV-R-13 — the search box stays usable while it drives the URL', () => {
    const searchInput = (): HTMLInputElement =>
      fixture.nativeElement.querySelector('input[aria-label="Search results"]') as HTMLInputElement;

    /**
     * Types one character at a time onto the value the component owns. `[value]="searchQuery()"`
     * makes the signal authoritative for the field, so the character a user types next lands on
     * whatever the last hydration left there — and that is precisely the coupling under test.
     * Assigning the whole query on every event would paper the defect over: a hydration that eats a
     * character mid-word is invisible when the next "keystroke" restores the full string by itself.
     */
    const typeInto = (text: string) => {
      const input = searchInput();
      for (const char of text) {
        input.value = component.searchQuery() + char;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges(); // the typed value reaches the `[value]` binding
        tick(); // the navigation settles and `queryParamMap` re-emits
        fixture.detectChanges(); // whatever the hydration decided is now in the DOM
      }
    };

    it('keeps the trailing space of a half-typed two-word query through the URL round-trip', fakeAsync(() => {
      typeInto('kenya');
      expect(component.searchQuery()).toBe('kenya');
      expect(queryParams$.value['search']).toBe('kenya');

      typeInto(' ');
      expect(component.searchQuery()).toBe('kenya ');
      expect(searchInput().value).toBe('kenya ');

      typeInto('risk');
      expect(component.searchQuery()).toBe('kenya risk');
      expect(searchInput().value).toBe('kenya risk');
      expect(queryParams$.value['search']).toBe('kenya risk');
    }));

    it('still matches a row on both tokens of a two-word query', fakeAsync(() => {
      typeInto('kenya risk');

      // "Kenya County Climate Risk Profiles" — reachable only if the space survived every keystroke.
      expect(component.filteredResults().map(r => r.result_code)).toEqual(['8706']);
    }));

    it('clears the box and the param when the clear button is used', fakeAsync(() => {
      typeInto('kenya risk');
      (fixture.nativeElement.querySelector('button[aria-label="Clear search"]') as HTMLButtonElement).click();
      tick();
      fixture.detectChanges();

      expect(component.searchQuery()).toBe('');
      expect(searchInput().value).toBe('');
      expect('search' in queryParams$.value).toBe(false);
    }));

    it('lets an external URL change (back/forward) overwrite what was typed', fakeAsync(() => {
      typeInto('kenya risk');

      queryParams$.next({});
      fixture.detectChanges();
      expect(component.searchQuery()).toBe('');

      queryParams$.next({ search: 'profiles' });
      fixture.detectChanges();
      expect(component.searchQuery()).toBe('profiles');
    }));
  });

  // Nicoleta Trifa via Ángel Jarrín, 2026-09-03: "Update result" existed only in the Results Center
  // row menu (P2-3229); from the centre's own list a 2025 result could not be carried into 2026.
  describe('Update result (P2-3229 from the centre list)', () => {
    beforeEach(() => {
      component.api.dataControlSE.reportingCurrentPhase = { phaseYear: 2026, phaseName: 'Reporting 2026', phaseId: 36, portfolioAcronym: 'P25', portfolioId: 3 } as any;
      component.phases.set([
        { id: 35, phase_year: 2025 } as any,
        { id: 36, phase_year: 2026 } as any,
      ]);
    });

    it('offers it on an approved W3 result of a previous phase', () => {
      expect(component.canUpdateResult(result({ status_name: 'Approved', version_id: 35 }))).toBe(true);
    });

    it('withholds it while the result is still in the open phase, not approved, or not a W3 result', () => {
      expect(component.canUpdateResult(result({ status_name: 'Approved', version_id: 36 }))).toBe(false);
      expect(component.canUpdateResult(result({ status_name: 'Editing', version_id: 35 }))).toBe(false);
      expect(component.canUpdateResult(result({ status_name: 'Approved', version_id: 35, source: 'Result' }))).toBe(false);
    });

    it('hands the row to the shared phase modal as a W3/Bilaterals result of this centre', () => {
      const row = result({ status_name: 'Approved', version_id: 35 });
      const event = { stopPropagation: jest.fn() } as unknown as Event;

      component.updateResult(row, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.api.dataControlSE.chagePhaseModal).toBe(true);
      expect(component.api.dataControlSE.currentResult).toEqual(
        expect.objectContaining({
          id: 1,
          result_code: '8706',
          source_name: 'W3/Bilaterals',
          lead_center: 'Bioversity (Alliance)',
          phase_year: 2025,
        }),
      );
    });

    // P2-3653. The action was offered on a Knowledge Product and only refused by the server, after
    // the user had confirmed. AC3 of P2-3229 says an ineligible result is not displayed at all.
    it('withholds it on a Knowledge Product', () => {
      expect(component.canUpdateResult(result({ status_name: 'Approved', version_id: 35, result_type_id: 6 }))).toBe(false);
    });

    // P2-3653. `From phase` and `Science Program` rendered blank in the confirmation modal when it
    // was opened from this list and populated when opened from the Results Center — the row carries
    // neither field. `phase_name` is derived here; `submitter` rides in from the payload.
    it('fills the phase name the modal shows, matching how the Results Center reports it', () => {
      component.phases.set([
        { id: 35, phase_year: 2025, phase_name: 'Reporting 2025', obj_portfolio: { acronym: 'P25' } } as any,
        { id: 36, phase_year: 2026, phase_name: 'Reporting 2026', obj_portfolio: { acronym: 'P25' } } as any,
      ]);

      component.updateResult(result({ status_name: 'Approved', version_id: 35, submitter: 'SP07' }), {
        stopPropagation: jest.fn(),
      } as unknown as Event);

      expect(component.api.dataControlSE.currentResult).toEqual(
        expect.objectContaining({ phase_name: 'Reporting 2025 - P25', submitter: 'SP07' }),
      );
    });

    it('falls back to the bare phase name rather than inventing a portfolio acronym', () => {
      component.phases.set([{ id: 35, phase_year: 2025, phase_name: 'Reporting 2025' } as any]);

      component.updateResult(result({ status_name: 'Approved', version_id: 35 }), {
        stopPropagation: jest.fn(),
      } as unknown as Event);

      expect((component.api.dataControlSE.currentResult as any).phase_name).toBe('Reporting 2025');
    });
  });

  describe('BSA-T-3: Viewport-Locked Scroller & Docked Filters', () => {
    it('should have pr-viewport-page host class', () => {
      expect((fixture.nativeElement as HTMLElement).classList.contains('pr-viewport-page')).toBe(true);
    });

    it('should render docked phase tabs and filter bar above #workArea scroller (BSA-R-4, BSA-R-5, BSA-AC-5, BSA-AC-6)', () => {
      const hostEl = fixture.nativeElement as HTMLElement;
      const dockedBar = hostEl.querySelector('.brl_docked') as HTMLElement;
      const filterBar = hostEl.querySelector('.brl_filter_bar') as HTMLElement;
      const workArea = hostEl.querySelector('#workArea') as HTMLElement;

      expect(dockedBar).toBeTruthy();
      expect(dockedBar.classList.contains('flex-none')).toBe(true);

      expect(filterBar).toBeTruthy();
      expect(workArea).toBeTruthy();

      // Verify workArea has overflow-y-auto at >=900px responsive class and custom scrollbar
      expect(workArea.className).toContain('min-[900px]:overflow-y-auto');
      expect(workArea.className).toContain('min-[900px]:flex-1');
      expect(workArea.className).toContain('min-[900px]:min-h-0');
      expect(workArea.className).toContain('custom_scroll');

      // Verify filter bar is docked above #workArea in DOM order
      expect(filterBar.compareDocumentPosition(workArea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(workArea.contains(filterBar)).toBe(false);
      expect(dockedBar.nextElementSibling).toBe(workArea);
    });

    it('should enclose table and catalog content (.brl_body) inside #workArea scroller (BSA-DD-4, BSA-DD-5)', () => {
      const workArea = fixture.nativeElement.querySelector('#workArea') as HTMLElement;
      expect(workArea).toBeTruthy();

      const brlBody = workArea.querySelector('.brl_body');
      expect(brlBody).toBeTruthy();

      const table = workArea.querySelector('app-pr-table');
      expect(table).toBeTruthy();
    });
  });

  describe('W1/W2 Aligned Row Menu', () => {
    let mockResult: BilateralCenterResult;

    beforeEach(() => {
      mockResult = result({ id: 99, result_code: '9901', version_id: 36, title: 'Sample Result' });
    });

    it('computes correct rowKey and toggles menu state', () => {
      expect(component.rowKey(mockResult)).toBe('9901|36');
      expect(component.isMenuOpen(mockResult)).toBe(false);

      const event = { stopPropagation: jest.fn() } as unknown as Event;
      component.toggleRowMenu(mockResult, event);
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.isMenuOpen(mockResult)).toBe(true);

      // Toggling again closes it
      component.toggleRowMenu(mockResult, event);
      expect(component.isMenuOpen(mockResult)).toBe(false);
    });

    it('closes menu when closeRowMenu or onRowMenuDetach is called', () => {
      component.openMenuKey.set('9901|36');
      expect(component.isMenuOpen(mockResult)).toBe(true);

      component.onRowMenuDetach(mockResult);
      expect(component.isMenuOpen(mockResult)).toBe(false);
    });

    it('navigates to result details on openResultFromMenu', () => {
      component.openMenuKey.set('9901|36');
      const openSpy = jest.spyOn(component, 'openResult');

      component.openResultFromMenu(mockResult);
      expect(component.openMenuKey()).toBeNull();
      expect(openSpy).toHaveBeenCalledWith(mockResult);
    });

    it('generates correct pdfHref and resultLink', () => {
      expect(component.pdfHref(mockResult)).toBe('/reports/result-details/9901?phase=36');

      const link = component.resultLink(mockResult);
      expect(link).toContain('/bilateral/');
      expect(link).toContain('/result/9901?phase=36');
    });

    it('copies result link to clipboard and triggers success toast on copyLink', () => {
      const clipboard = TestBed.inject(Clipboard);
      const copySpy = jest.spyOn(clipboard, 'copy').mockReturnValue(true);
      const toastSE = TestBed.inject(PrToastService);
      const toastSpy = jest.spyOn(toastSE, 'add').mockImplementation(() => {});

      component.openMenuKey.set('9901|36');
      component.copyLink(mockResult);

      expect(copySpy).toHaveBeenCalledWith(expect.stringContaining('/result/9901?phase=36'));
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'globalUserNotification',
          severity: 'success',
          summary: 'Result link copied',
        }),
      );
      expect(component.openMenuKey()).toBeNull();
    });

    it('calls ResultDeletionService.deleteWithConfirmation on deleteResult and removes item on success', () => {
      component.results.set([mockResult, result({ id: 100, result_code: '1000' })]);
      const deletionSE = TestBed.inject(ResultDeletionService);
      let successCallback: (() => void) | undefined;
      jest.spyOn(deletionSE, 'deleteWithConfirmation').mockImplementation((res: any, options: any) => {
        successCallback = options?.onSuccess;
      });

      component.openMenuKey.set('9901|36');
      component.deleteResult(mockResult);

      expect(component.openMenuKey()).toBeNull();
      expect(deletionSE.deleteWithConfirmation).toHaveBeenCalledWith(mockResult, expect.any(Object));

      // Invoke success callback
      successCallback?.();
      expect(component.results().some(r => r.id === 99)).toBe(false);
      expect(component.results().length).toBe(1);
    });

    it('evaluates canDeleteResult properly for admins vs non-admins', () => {
      rolesService.isAdmin = true;
      expect(component.canDeleteResult(mockResult)).toBe(true);

      rolesService.isAdmin = false;
      // When status_id === 1 (Editing), center user can delete
      expect(component.canDeleteResult(result({ source: 'API', status_id: 1 }))).toBe(true);
      // When status_id !== 1 (e.g. Approved / QA), non-admin cannot delete
      expect(component.canDeleteResult(result({ source: 'API', status_id: 6 }))).toBe(false);
      // When source !== 'API', cannot delete
      expect(component.canDeleteResult(result({ source: 'W1/W2', status_id: 1 }))).toBe(false);
    });
  });

  describe('Empty States & Skeleton Loader', () => {
    it('renders table skeleton with 6 pulsing rows when isFirstLoad is true', () => {
      component.initializing.set(true);
      fixture.detectChanges();

      expect(component.isFirstLoad()).toBe(true);
      const skeletonEl = fixture.nativeElement.querySelector('[data-testid="bilateral-results-skeleton"]');
      expect(skeletonEl).not.toBeNull();

      const skeletonRows = skeletonEl.querySelectorAll('.rc-row--skeleton');
      expect(skeletonRows.length).toBe(6);

      const pulseElements = skeletonEl.querySelectorAll('.animate-pulse');
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('renders filtered empty state when results exist but active filter yields 0 matches', () => {
      component.initializing.set(false);
      component.loading.set(false);
      component.results.set([result({ title: 'Unique Result' })]);
      component.searchQuery.set('Nonexistent 9999');
      fixture.detectChanges();

      expect(component.isFilteredEmpty()).toBe(true);
      expect(component.hasRows()).toBe(false);

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="bilateral-results-filtered-empty"]');
      expect(emptyEl).not.toBeNull();
      expect(emptyEl.textContent).toContain('No results match these filters');
      expect(emptyEl.textContent).toContain('Nonexistent 9999');

      // Clear all filters restores the rows
      const clearSpy = jest.spyOn(component, 'clearAllFilters');
      const clearBtn = emptyEl.querySelector('button');
      expect(clearBtn).not.toBeNull();
      clearBtn.click();
      expect(clearSpy).toHaveBeenCalled();
    });

    it('renders nothing-yet empty state when center has 0 results reported', () => {
      component.initializing.set(false);
      component.loading.set(false);
      component.results.set([]);
      fixture.detectChanges();

      expect(component.isNothingYet()).toBe(true);
      expect(component.hasRows()).toBe(false);

      const emptyEl = fixture.nativeElement.querySelector('[data-testid="bilateral-results-empty"]');
      expect(emptyEl).not.toBeNull();
      expect(emptyEl.textContent).toContain('No results reported yet');

      const reportingLink = emptyEl.querySelector('a');
      expect(reportingLink).not.toBeNull();
      expect(reportingLink.textContent).toContain('Go to Reporting');
    });

    it('renders skeleton rows inside prTableLoading when table reloads in the background', () => {
      component.initializing.set(false);
      component.loading.set(true);
      component.results.set([result()]);
      fixture.detectChanges();

      expect(component.hasRows()).toBe(true);
      const tableLoadingRows = fixture.nativeElement.querySelectorAll('.rc-pr-table .rc-row--skeleton');
      expect(tableLoadingRows.length).toBe(6);
    });
  });
});
