import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Params, Router, RouterModule } from '@angular/router';
import { BehaviorSubject, map, of, Subject, throwError } from 'rxjs';
import { signal } from '@angular/core';
import {
  BilateralResultsListComponent,
  BilateralCenterResult,
  BILATERAL_COLUMNS,
  BILATERAL_COLUMN_WIDTHS_STORAGE_KEY,
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
    is_replicated: false,
    description: 'Profiles co-developed with the county governments of Kenya.',
    project_name: 'Accelerating Impacts of CGIAR Climate Research for Africa',
    created_by_name: 'Angel Jarrin',
    ...overrides,
  });

  beforeEach(async () => {
    localStorage.clear();
    queryParams$ = new BehaviorSubject<Params>({});

    bilateralApiService = {
      GET_bilateralCenterResults: jest.fn().mockReturnValue(of({ response: [result()] })),
      // `PMF-T-1` wave 2 — the Project options' source (the center's own catalog, per
      // selected phase year). Default: answers empty, so the option list starts empty like
      // a center with no reportable projects for the selected phase.
      GET_bilateralProjects: jest.fn().mockReturnValue(of({ response: { projects: [] } })),
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

      const stored = JSON.parse(localStorage.getItem('pr.bilateralResults.visibleColumns.v5') ?? '{}');
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

  /**
   * `BSC-T-2` (`bilateral/results-list-source-column-split`) — the `Source` column cell was split
   * into two independently-toggleable columns by `BSC-T-1`: `Origin` (result-origin only, key
   * `source`) and `Funding source` (the `W3`/`W1-W2` badge, key `fundingSource`). Both cells share
   * `td.rc-td--source` (the two columns share `attr: 'source'` for skeleton-width parity per
   * `BSC-DD-2`), so a row's Origin cell is always the FIRST `td.rc-td--source` in DOM order and its
   * Funding source cell the SECOND — `cols`/`BILATERAL_COLUMNS` always place `source` immediately
   * before `fundingSource`.
   */
  describe('BSC-T-2 — Origin / Funding source columns render independently (BSC-AC-1, BSC-AC-2)', () => {
    const sourceCells = (): HTMLElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('td.rc-td--source')) as HTMLElement[];

    it('renders the AI Result badge (Origin) and the W3 badge (Funding source) for an AI-originated W3 row, never swapped', () => {
      component.results.set([result({ id: 1, source: 'API', is_ai_generated: true })]);
      fixture.detectChanges();

      const [originCell, fundingCell] = sourceCells();
      expect(originCell.textContent?.replace(/\s+/g, ' ').trim()).toContain('AI Result');
      expect(originCell.querySelector('.brl_source_badge')).toBeNull();
      expect(fundingCell.textContent?.trim()).toBe('W3');
      expect(fundingCell.querySelector('.brl_ai_badge')).toBeNull();
    });

    it('renders the plain "Manual" label (Origin) and the W1/W2 badge (Funding source) for a manually created W1/W2 row, never swapped', () => {
      // The default Source chips only show W3 (API) rows (`showW3=true`, `showW1W2=false`) — a
      // non-API row needs the W1/W2 chip on too, or `filterCenterResults` drops it before it ever
      // reaches the table.
      component.toggleW1W2();
      component.results.set([result({ id: 1, source: 'Result', is_ai_generated: false })]);
      fixture.detectChanges();

      const [originCell, fundingCell] = sourceCells();
      expect(originCell.textContent?.trim()).toBe('Manual');
      expect(originCell.querySelector('.brl_ai_badge')).toBeNull();
      expect(fundingCell.textContent?.trim()).toBe('W1/W2');
      expect(fundingCell.querySelector('.brl_source_badge--w3')).toBeNull();
    });
  });

  /**
   * `BSC-T-2` / `BSC-AC-3` — the mechanism this test exercises: `BILATERAL_COLUMN_STORAGE_KEY` was
   * bumped `v4` -> `v5` in the same `BSC-T-1` diff that added the `fundingSource` column. A real
   * user's pre-existing preference (stored under the OLD `v4` key name, shaped like the OLD, 10-key
   * `BILATERAL_COLUMNS`, with no `fundingSource` entry because that column didn't exist yet) must
   * never suppress the new column. `readStoredColumnVisibility()` only ever reads the CURRENT
   * (`v5`) key, so the stale `v4` blob is never consulted at all — the merge in `columnVisibility`
   * (`{...defaultColumnVisibility(), ...readStoredColumnVisibility()}`) then falls through to
   * `fundingSource`'s `defaultOn: true`.
   *
   * Falsifier honesty note (ties to `tasks.md`'s disqualifier clause): with THIS component's
   * `visibleColumns` filter (`vis[c.key] !== false`), a key absent from whatever map is actually
   * read always resolves to visible via `defaultColumnVisibility()`'s `defaultOn: true` — that is
   * true whether the map came from the current key or (hypothetically) an unbumped one. Two cases
   * below make the real, falsifiable claims explicit instead of resting on that alone:
   * (1) a `v4`-shaped blob stored at the OLD key is never read at all post-bump (`type: false`
   *     there has NO effect — proving the stale key is truly orphaned, not "mostly ignored"); and
   * (2) the same shape read from the CURRENT key (simulating "no bump, but the column is new")
   *     DOES suppress `type` (proving the map is genuinely honored when it applies) while STILL
   *     leaving `fundingSource` visible (absent key -> `defaultOn`). What would regress without
   *     `BSC-T-1` is `fundingSource` not existing in `BILATERAL_COLUMNS` at all — case (2)'s second
   *     assertion is false before that fix and true after, which is the red/green this task's own
   *     verification line requires.
   */
  describe('BSC-T-2 — stale pre-v5 stored preference does not hide Funding source (BSC-AC-3)', () => {
    // The full v4 column set (code, source, title, project, description, type, role, status,
    // createdBy, created) — a real snapshot `toggleColumn` would have written before this spec,
    // with no `fundingSource` entry because that column didn't exist yet.
    const v4ShapedPreference = {
      code: true,
      source: true,
      title: true,
      project: true,
      description: true,
      type: false,
      role: true,
      status: true,
      createdBy: true,
      created: true,
    };

    const recreateComponent = () => {
      fixture.destroy();
      fixture = TestBed.createComponent(BilateralResultsListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      fixture.detectChanges();
    };

    it('ignores a v4-shaped blob stored under the OLD key entirely — Funding source visible, and the stale "type: false" has no effect', () => {
      localStorage.setItem('pr.bilateralResults.visibleColumns.v4', JSON.stringify(v4ShapedPreference));
      recreateComponent();

      expect(component.isColumnVisible('type')).toBe(true);
      expect(component.visibleColumns().map(c => c.key)).toContain('fundingSource');
      expect(component.isColumnVisible('fundingSource')).toBe(true);
    });

    it('still shows Funding source even if the very same v4-shaped blob were read from the CURRENT key, although it does honor a real hidden column', () => {
      localStorage.setItem('pr.bilateralResults.visibleColumns.v5', JSON.stringify(v4ShapedPreference));
      recreateComponent();

      // The map IS honored for a key it actually carries — proving this isn't a "no map is ever
      // read" tautology.
      expect(component.isColumnVisible('type')).toBe(false);
      // `fundingSource` is absent from the map (it didn't exist when it was saved) and still
      // defaults to visible — the mechanism `BSC-AC-3` actually depends on.
      expect(component.visibleColumns().map(c => c.key)).toContain('fundingSource');
      expect(component.isColumnVisible('fundingSource')).toBe(true);
    });
  });

  /** `BSC-T-2` / `BSC-AC-4` — the Columns picker lists `Origin` and `Funding source` as two
   *  separate rows, each independently toggleable (toggling one never affects the other). */
  describe('BSC-T-2 — Columns picker lists Origin and Funding source separately (BSC-AC-4)', () => {
    const pickerItem = (label: string): HTMLElement | undefined => {
      const panel = fixture.nativeElement.querySelector('.rc-cols-panel[role="dialog"][aria-label="Visible columns"]');
      const items = Array.from(panel?.querySelectorAll('.rc-cols-item') ?? []) as HTMLElement[];
      return items.find(el => el.querySelector('.rc-cols-item__label')?.textContent?.trim() === label);
    };

    it('lists both as separate entries and toggles each independently', () => {
      component.toggleColumnsPanel();
      fixture.detectChanges();

      const originItem = pickerItem('Origin');
      const fundingItem = pickerItem('Funding source');
      expect(originItem).toBeTruthy();
      expect(fundingItem).toBeTruthy();
      expect(originItem).not.toBe(fundingItem);

      fundingItem!.click();
      fixture.detectChanges();
      expect(component.isColumnVisible('fundingSource')).toBe(false);
      expect(component.isColumnVisible('source')).toBe(true);

      originItem!.click();
      fixture.detectChanges();
      expect(component.isColumnVisible('source')).toBe(false);
      expect(component.isColumnVisible('fundingSource')).toBe(false);
    });
  });

  /**
   * Rework of `BSC-T-1` — bug found in the browser (Reviewer-flagged gap: "no live browser check
   * was run"). `source` (Origin) and `fundingSource` (Funding source) share `attr: 'source'`
   * (`BSC-DD-2`, unchanged), which fed the SAME `field` into `PrSortableColumnDirective`/
   * `pr-sort-icon` for both `<th>`s — clicking either one's sort control showed BOTH columns as
   * sorted. `BilateralColumnDef.sortKey` gives Origin its own sort identity
   * (`is_ai_generated`) via the new `sortField(column)` helper, independent of Funding source's
   * (`source`, unchanged). These tests assert both halves of the fix: clicking one column's
   * header never marks the other as active (`aria-sort`/icon state), AND each actually reorders
   * the rows by its own field.
   */
  describe('Origin / Funding source sort independence (rework of BSC-T-1)', () => {
    const sortableHeader = (title: string): HTMLElement | undefined =>
      (Array.from(fixture.nativeElement.querySelectorAll('th.rc-th--sortable')) as HTMLElement[]).find(th =>
        th.textContent?.includes(title),
      );

    const resultCodesInOrder = (): string[] =>
      (Array.from(fixture.nativeElement.querySelectorAll('span.rc-code')) as HTMLElement[]).map(el =>
        el.textContent?.trim() ?? '',
      );

    it('clicking Origin sorts by is_ai_generated and leaves Funding source unsorted', () => {
      component.results.set([
        result({ id: 1, result_code: '3000', source: 'API', is_ai_generated: true }),
        result({ id: 2, result_code: '1000', source: 'API', is_ai_generated: false }),
      ]);
      fixture.detectChanges();

      // Default table sort (`sortField="result_code"`, descending): 3000 then 1000.
      expect(resultCodesInOrder()).toEqual(['3000', '1000']);

      const originHeader = sortableHeader('Origin')!;
      const fundingHeader = sortableHeader('Funding source')!;
      expect(originHeader).toBeTruthy();
      expect(fundingHeader).toBeTruthy();

      originHeader.click();
      fixture.detectChanges();

      // Clicking a fresh field sorts ascending: `is_ai_generated` false (1000) before true (3000).
      expect(resultCodesInOrder()).toEqual(['1000', '3000']);
      expect(originHeader.getAttribute('aria-sort')).toBe('ascending');
      // The bug: Funding source shared the same `field`, so it also reported active. It must not.
      expect(fundingHeader.getAttribute('aria-sort')).toBeNull();
      expect(fundingHeader.querySelector('.pr-sort-icon')?.classList.contains('pr-sort-icon--active')).toBe(false);
    });

    it('clicking Funding source sorts by source and leaves Origin unsorted', fakeAsync(() => {
      // Both W3 (API) and W1/W2 (Result) rows must be visible for a source-value spread.
      component.toggleW1W2();
      component.results.set([
        result({ id: 1, result_code: '3000', source: 'Result', is_ai_generated: false }),
        result({ id: 2, result_code: '1000', source: 'API', is_ai_generated: false }),
      ]);
      fixture.detectChanges();
      // The constructor's `effect(() => { this.filteredResults(); untracked(() => this.table?.reset()) })`
      // (resets the table's sort to default whenever the filtered set changes) is scheduled on a
      // microtask, not flushed synchronously by `detectChanges()` alone — `tick()` (fakeAsync) drains
      // it. Skipping this would let the reset fire AFTER our click below and silently wipe the sort
      // we just triggered, exactly the failure mode this test caught while it was written.
      tick();
      fixture.detectChanges();

      // Default table sort (`sortField="result_code"`, descending): 3000 then 1000.
      expect(resultCodesInOrder()).toEqual(['3000', '1000']);

      const originHeader = sortableHeader('Origin')!;
      const fundingHeader = sortableHeader('Funding source')!;

      fundingHeader.click();
      tick();
      fixture.detectChanges();

      // Ascending on `source`: 'API' (1000) before 'Result' (3000) — the opposite of the default,
      // proving an actual reorder by the real `source` field, not a no-op.
      expect(resultCodesInOrder()).toEqual(['1000', '3000']);
      expect(fundingHeader.getAttribute('aria-sort')).toBe('ascending');
      // Origin must stay untouched by Funding source's click.
      expect(originHeader.getAttribute('aria-sort')).toBeNull();
      expect(originHeader.querySelector('.pr-sort-icon')?.classList.contains('pr-sort-icon--active')).toBe(false);
    }));
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

  describe('Created by filter and column', () => {
    it('offers the Created by column visible by default and renders the creator name', () => {
      expect(component.visibleColumns().map(c => c.key)).toContain('createdBy');
      const cell = fixture.nativeElement.querySelector('td.rc-td--created_by_name');
      expect(cell?.textContent?.trim()).toBe('Angel Jarrin');
    });

    it('builds multiselect options from loaded rows and filters the table', () => {
      component.results.set([
        result({ id: 1, created_by_name: 'Angel Jarrin' }),
        result({ id: 2, result_code: '8707', created_by_name: 'Santiago Sanchez' }),
      ]);
      fixture.detectChanges();

      expect(component.createdBySelectOptions().map(o => o.value)).toEqual(['Angel Jarrin', 'Santiago Sanchez']);

      component.onCreatedByFilterChange(['Santiago Sanchez']);
      expect(component.filteredResults()).toHaveLength(1);
      expect(component.filteredResults()[0].result_code).toBe('8707');
      expect(component.activeChips().some(chip => chip.label === 'Created by: Santiago Sanchez')).toBe(true);
    });
  });

  /**
   * `changes/project-multiselect-filter` (`PMF-T-1`, pivot) — the Project multiselect in the
   * Filters popover. Options come from the CENTER'S OWN catalog per selected phase year, never
   * from loaded rows: contributing rows display other Centers' projects, and catalog projects
   * with zero rows would never appear at all. OR/AND semantics, the URL round-trip and
   * deep-link retention drive the harness above (route subject + merge-semantics navigate
   * spy), so what is asserted is what a real selection, deep link or chip removal produces.
   */
  describe('PMF-T-1 — Project multiselect filter (center catalog, phase-scoped)', () => {
    /** A catalog entry as `GET_bilateralProjects` returns it (`BilateralProject`) — ids may arrive as strings. */
    const catalogProject = (id: number | string, shortName: string, fullName: string) => ({
      id,
      shortName,
      fullName,
      summary: null,
      description: null,
      leadCenter: null,
      sciencePrograms: [],
    });

    /** Two P25 reporting phases — closed 2025 (id 35) and open 2026 (id 36). */
    const BOTH_PHASES = [
      { id: '35', phase_year: 2025, status: false, obj_portfolio: { acronym: 'P25' } },
      { id: '36', phase_year: 2026, status: true, obj_portfolio: { acronym: 'P25' } },
    ];

    const selectBothPhases = () => {
      phasesService.phases.reporting = BOTH_PHASES;
      bilateralApiService.GET_bilateralProjects.mockClear();
      recreateOn({ phase: '35,36' });
    };

    it('offers no project while the catalog has not answered or answers empty', () => {
      // The default mock answers an empty catalog for the default-selected 2026 phase.
      expect(component.selectedPhaseYears()).toEqual([2026]);
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledWith('CIAT-BIOVERSITY', 2026);
      expect(component.projectSelectOptions()).toEqual([]);
    });

    it('unions the two selected phase years, dedupes by id across and within years, and labels `shortName fullName`', fakeAsync(() => {
      phasesService.phases.reporting = BOTH_PHASES;
      bilateralApiService.GET_bilateralProjects.mockImplementation((_center: string, year: number) =>
        of({
          response: {
            projects:
              year === 2025
                ? [
                    catalogProject('118', 'A-AG10156', '  Accelerating Impacts of CGIAR Climate Research for Africa '),
                    catalogProject(204, '', ''), // no usable name → Project <id>
                    catalogProject('118', 'A-AG10156', 'Accelerating Impacts of CGIAR Climate Research for Africa'), // duplicate within the year
                  ]
                : [
                    catalogProject(50, 'apple orchards', 'Apple value chains'), // first only if sort ignores case
                    catalogProject(300, 'Banana Republic', 'Banana value chains'),
                    catalogProject(118, 'A-AG10156', 'Accelerating Impacts of CGIAR Climate Research for Africa'), // shared across years → one option
                  ],
          },
        }),
      );

      selectBothPhases();
      tick();
      fixture.detectChanges();

      // Exactly one request per selected year, carrying the year — never an unselected one.
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledTimes(2);
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledWith('CIAT-BIOVERSITY', 2025);
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledWith('CIAT-BIOVERSITY', 2026);

      // Labels are trimmed `shortName fullName` (numeric-string ids normalize), one option
      // per id across phases, `Project <id>` fallback, sorted case-insensitively.
      expect(component.projectSelectOptions()).toEqual([
        { value: 118, label: 'A-AG10156 Accelerating Impacts of CGIAR Climate Research for Africa' },
        { value: 50, label: 'apple orchards Apple value chains' },
        { value: 300, label: 'Banana Republic Banana value chains' },
        { value: 204, label: 'Project 204' },
      ]);
    }));

    it('fetches each phase year once per page lifetime and only years not already requested', fakeAsync(() => {
      bilateralApiService.GET_bilateralProjects.mockImplementation((_center: string, year: number) =>
        of({ response: { projects: [catalogProject(year === 2025 ? 600 : 700, `P${year}`, `Catalog ${year}`)] } }),
      );

      selectBothPhases();
      tick();
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledTimes(2);

      // Repeated popover opens and selections never refetch a loaded year — neither the
      // catalog nor the results endpoint moves.
      const resultsCallsAfterLoad = bilateralApiService.GET_bilateralCenterResults.mock.calls.length;
      component.filterPopoverOpen.set(true);
      component.onProjectFilterChange([600]);
      component.onProjectFilterChange([600, 700]);
      tick();
      fixture.detectChanges();
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledTimes(2);
      expect(bilateralApiService.GET_bilateralCenterResults).toHaveBeenCalledTimes(resultsCallsAfterLoad);

      // Unselecting a year removes its projects from the offered options; a project that
      // stays SELECTED but is no longer offered is retained with a `Project <id>` label
      // (`PMF-DD-3` — never silently dropped), appended after the offered options.
      component.togglePhase(component.phases()[0]); // 2025 off → [36]
      tick();
      fixture.detectChanges();
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledTimes(2);
      expect(component.projectSelectOptions()).toEqual([
        { value: 700, label: 'P2026 Catalog 2026' },
        { value: 600, label: 'Project 600' },
      ]);

      component.togglePhase(component.phases()[0]); // 2025 back on → [35, 36]
      tick();
      fixture.detectChanges();
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledTimes(2);
      expect(component.projectSelectOptions()).toEqual([
        { value: 600, label: 'P2025 Catalog 2025' },
        { value: 700, label: 'P2026 Catalog 2026' },
      ]);
    }));

    it('degrades to the other years when one year fails, and never retries the failed year', fakeAsync(() => {
      bilateralApiService.GET_bilateralProjects.mockImplementation((_center: string, year: number) =>
        year === 2025
          ? throwError(() => new Error('catalog unavailable'))
          : of({ response: { projects: [catalogProject(700, 'P2026', 'Catalog 2026')] } }),
      );

      selectBothPhases();
      tick();
      fixture.detectChanges();

      // 2026 survives; the failed 2025 is simply absent — no invented value, no error state.
      expect(component.projectSelectOptions().map(o => o.value)).toEqual([700]);
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledTimes(2);

      // Toggling the failed year off and back on must not re-request it (no retry loop).
      component.togglePhase(component.phases()[0]); // [36]
      tick();
      component.togglePhase(component.phases()[0]); // [35, 36]
      tick();
      fixture.detectChanges();
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledTimes(2);
      expect(component.projectSelectOptions().map(o => o.value)).toEqual([700]);
    }));

    it('keeps the current (possibly empty) options while a catalog year is still in flight', () => {
      bilateralApiService.GET_bilateralProjects.mockReturnValue(new Subject()); // never answers
      recreateOn();

      expect(component.selectedPhaseYears()).toEqual([2026]);
      expect(component.projectSelectOptions()).toEqual([]);

      // The control itself is unaffected: same popover, same field — no project-specific
      // loading or error surface was added.
      component.filterPopoverOpen.set(true);
      fixture.detectChanges();
      const popover = fixture.nativeElement.querySelector('div[role="dialog"][aria-label="Result filters"]');
      expect(popover).toBeTruthy();
      expect(popover.querySelector('.brl-filter-field[aria-label="Filter by project"]')).toBeTruthy();
    });

    it('matches either selected project, ANDs with the creator filter, and never refetches', fakeAsync(() => {
      bilateralApiService.GET_bilateralProjects.mockReturnValue(
        of({
          response: {
            projects: [
              catalogProject(118, 'A-AG10156', 'Rice for Africa'),
              catalogProject(204, 'A-AG10171', 'Banana Republic'),
            ],
          },
        }),
      );
      bilateralApiService.GET_bilateralCenterResults.mockReturnValue(
        of({
          response: [
            result({ id: 1, project_id: 118, project_name: 'Rice for Africa', created_by_name: 'Angel Jarrin' }),
            result({ id: 2, project_id: 204, project_name: 'Banana Republic', created_by_name: 'Angel Jarrin' }),
            result({ id: 3, project_id: 118, created_by_name: 'Santiago Sanchez' }),
            result({ id: 4, project_id: null }),
            result({ id: 5, project_id: 999, project_name: 'Other project' }),
          ],
        }),
      );
      recreateOn();
      tick();
      const resultsCallsAfterLoad = bilateralApiService.GET_bilateralCenterResults.mock.calls.length;
      const catalogCallsAfterLoad = bilateralApiService.GET_bilateralProjects.mock.calls.length;
      expect(resultsCallsAfterLoad).toBeGreaterThan(0);
      expect(catalogCallsAfterLoad).toBeGreaterThan(0);

      component.onCreatedByFilterChange(['Angel Jarrin']);
      component.onProjectFilterChange([118, 204]);

      // OR within projects, AND across dimensions; unlinked and unselected rows never match.
      expect(component.filteredResults().map(r => r.id)).toEqual([1, 2]);
      expect(component.activeChips().some(chip => chip.label === 'Project: Rice for Africa')).toBe(true);

      // Only the center's catalog projects are offered: 999 rides on a loaded row but is
      // not a catalog project of this center, so it never becomes an option.
      expect(component.projectSelectOptions().map(o => o.value)).toEqual([118, 204]);

      // Changing only the selection adds no request of any kind — results or catalog.
      component.onProjectFilterChange([118]);
      expect(bilateralApiService.GET_bilateralCenterResults).toHaveBeenCalledTimes(resultsCallsAfterLoad);
      expect(bilateralApiService.GET_bilateralProjects).toHaveBeenCalledTimes(catalogCallsAfterLoad);
    }));

    it('never offers foreign-center projects that only loaded rows carry', fakeAsync(() => {
      bilateralApiService.GET_bilateralProjects.mockReturnValue(
        of({ response: { projects: [catalogProject(1368, 'A-AG10171', 'Center-owned catalog project')] } }),
      );
      bilateralApiService.GET_bilateralCenterResults.mockReturnValue(
        of({
          response: [
            result({ id: 1, project_id: 1572, project_name: '1572-MIPO/CIP — a CIP project this center contributes to' }),
            result({ id: 2, project_id: 1523, project_name: '1523-BMGF/RTB — a BMGF project this center contributes to' }),
            result({ id: 3, project_id: 1368, project_name: 'Center-owned catalog project' }),
          ],
        }),
      );
      recreateOn();
      tick();
      fixture.detectChanges();

      // The pivot's defect class: rows where the center only contributes display other
      // Centers' projects — those must not leak into the option list.
      expect(component.projectSelectOptions().map(o => o.value)).toEqual([1368]);
    }));

    it('selects two projects, writes the comma URL with ?result= kept, rehydrates, and clears each way', fakeAsync(() => {
      bilateralApiService.GET_bilateralProjects.mockReturnValue(
        of({
          response: {
            projects: [
              catalogProject(118, 'A-AG10156', 'Rice for Africa'),
              catalogProject(204, 'A-AG10171', 'Banana Republic'),
            ],
          },
        }),
      );
      bilateralApiService.GET_bilateralCenterResults.mockReturnValue(
        of({
          response: [
            result({ id: 1, project_id: 118, project_name: 'Rice for Africa' }),
            result({ id: 2, result_code: '8707', project_id: 204, project_name: null }),
          ],
        }),
      );
      recreateOn({ result: '8706', search: 'kenya' });

      component.onProjectFilterChange([118, 204]);
      tick();
      fixture.detectChanges();

      // Comma-separated `project`, merged with (never replacing) the unrelated params, no history entry.
      expect(queryParams$.value['project']).toBe('118,204');
      expect(queryParams$.value['result']).toBe('8706');
      expect(queryParams$.value['search']).toBe('kenya');
      expect(navigateSpy).toHaveBeenCalledTimes(1); // the write itself — no re-hydration loop
      expect(navigateSpy).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParamsHandling: 'merge', replaceUrl: true }),
      );

      // Re-hydration restored both selections and both labelled chips (204 has no row name → fallback).
      expect(component.projectFilter()).toEqual([118, 204]);
      expect(chipTexts().some(text => text.includes('Project: Rice for Africa'))).toBe(true);
      expect(chipTexts().some(text => text.includes('Project: Project 204'))).toBe(true);
      expect(component.filteredResults().map(r => r.result_code)).toEqual(['8706', '8707']);

      // Removing one chip drops only that project from the URL and the strip.
      chipRemoveButton('Project: Rice for Africa')!.click();
      tick();
      fixture.detectChanges();
      expect(component.projectFilter()).toEqual([204]);
      expect(queryParams$.value['project']).toBe('204');
      expect(queryParams$.value['result']).toBe('8706');
      expect(chipTexts().some(text => text.includes('Project: Rice for Africa'))).toBe(false);

      // Clear all removes every project selection and chip, still without touching ?result=.
      component.clearAllFilters();
      tick();
      fixture.detectChanges();
      expect(component.projectFilter()).toEqual([]);
      expect('project' in queryParams$.value).toBe(false);
      expect(chipTexts().some(text => text.includes('Project:'))).toBe(false);
      expect(queryParams$.value['result']).toBe('8706');
    }));

    it('keeps a deep-linked project id selectable and removable when the catalog does not carry it', fakeAsync(() => {
      bilateralApiService.GET_bilateralProjects.mockReturnValue(
        of({ response: { projects: [catalogProject(118, 'A-AG10156', 'Rice for Africa')] } }),
      );
      bilateralApiService.GET_bilateralCenterResults.mockReturnValue(
        of({ response: [result({ id: 1, project_id: 118, project_name: 'Rice for Africa' })] }),
      );
      recreateOn({ project: '999' });

      expect(component.projectFilter()).toEqual([999]);
      expect(component.projectSelectOptions()).toEqual([
        { value: 118, label: 'A-AG10156 Rice for Africa' },
        { value: 999, label: 'Project 999' },
      ]);
      expect(chipTexts().some(text => text.includes('Project: Project 999'))).toBe(true);

      chipRemoveButton('Project: Project 999')!.click();
      tick();
      fixture.detectChanges();

      expect(component.projectFilter()).toEqual([]);
      expect('project' in queryParams$.value).toBe(false);
      expect(chipTexts().some(text => text.includes('Project:'))).toBe(false);
    }));

    it('renders the Project multiselect between Source and Created by with a visible label and group name', () => {
      component.filterPopoverOpen.set(true);
      fixture.detectChanges();

      const popover = fixture.nativeElement.querySelector('div[role="dialog"][aria-label="Result filters"]');
      expect(popover).toBeTruthy();

      const labels = Array.from(popover.querySelectorAll('.brl_filter_group_label')).map(
        el => (el.textContent ?? '').trim(),
      );
      expect(labels).toEqual(['Phase', 'Source', 'Project', 'Science Program', 'Created by', 'Center role']);

      const projectField = popover.querySelector('.brl-filter-field[aria-label="Filter by project"]');
      expect(projectField).toBeTruthy();
      expect(projectField.querySelector('app-pr-filter-multiselect')).toBeTruthy();
    });
  });

  /**
   * `changes/bilateral-science-program-filter` (`BSF-T-1`/`BSF-T-2`) — the Science Program
   * multiselect in the Filters popover. Wiring (options → `programFilter` → `filterCenterResults` →
   * chips → URL) mirrors the Project multiselect field-for-field, so these tests mirror the
   * PMF-T-1 tests' structure/patterns above, exercising `program*` signals throughout — never
   * `project*` ones left over from a copy-paste.
   */
  describe('Science Program filter (BSF-T-1/BSF-T-2)', () => {
    it('narrows visible rows to the selected Science Program (BSF-R-2, Scenario "Filtering by one Science Program")', () => {
      component.results.set([
        result({ id: 1, submitter: 'SP01' }),
        result({ id: 2, result_code: '8707', submitter: 'SP02' }),
      ]);

      component.onProgramFilterChange(['SP01']);

      expect(component.programFilter()).toEqual(['SP01']);
      expect(component.filteredResults().map(r => r.id)).toEqual([1]);
    });

    it('shows a removable "Science Program: <label>" chip with dimension "program" once a program is selected (BSF-R-3)', () => {
      component.onProgramFilterChange(['SP01']);
      fixture.detectChanges();

      const chip = component.activeChips().find(c => c.dimension === 'program');
      expect(chip).toBeTruthy();
      expect(chip!.value).toBe('SP01');
      // No catalog entry loaded for 'SP01' in this test, so the label falls back to the bare code
      // (`programSelectOptions` `PMF-DD-3`-style fallback) — still the required `Science Program: …` shape.
      expect(chip!.label).toBe('Science Program: SP01');
      expect(chipTexts().some(text => text.includes('Science Program: SP01'))).toBe(true);
    });

    it('removing the chip restores the full applicable row set and clears the multiselect, without disturbing an active Project filter (BSF-R-3, Scenario "Removing the filter via chip")', () => {
      component.results.set([
        result({ id: 1, submitter: 'SP01', project_id: 118, project_name: 'Rice for Africa' }),
        result({ id: 2, result_code: '8707', submitter: 'SP02', project_id: 118, project_name: 'Rice for Africa' }),
        result({ id: 3, result_code: '8708', submitter: 'SP01', project_id: 204 }),
      ]);

      component.onProjectFilterChange([118]);
      component.onProgramFilterChange(['SP01']);
      expect(component.filteredResults().map(r => r.id)).toEqual([1]);

      component.removeProgramFilter('SP01');

      expect(component.programFilter()).toEqual([]);
      // The Project filter (118) is still active and untouched — rows 1 and 2 both carry it.
      expect(component.projectFilter()).toEqual([118]);
      expect(component.filteredResults().map(r => r.id)).toEqual([1, 2]);
      expect(component.activeChips().some(c => c.dimension === 'program')).toBe(false);
      expect(component.activeChips().some(c => c.dimension === 'project')).toBe(true);
    });

    it('Clear all also clears the Science Program selection (BSF-R-4)', () => {
      component.onProgramFilterChange(['SP01']);
      expect(component.programFilter()).toEqual(['SP01']);

      component.clearAllFilters();

      expect(component.programFilter()).toEqual([]);
    });

    it('hydrates programFilter and filters the table from a deep link ?program=SP02 (BSF-R-5, Scenario "Deep link with a Science Program preselected")', () => {
      bilateralApiService.GET_bilateralCenterResults.mockReturnValue(
        of({
          response: [
            result({ id: 1, submitter: 'SP01' }),
            result({ id: 2, result_code: '8707', submitter: 'SP02' }),
          ],
        }),
      );

      recreateOn({ program: 'SP02' });

      expect(component.programFilter()).toEqual(['SP02']);
      expect(component.filteredResults().map(r => r.id)).toEqual([2]);
    });

    it('loads Science Program options from GET_AllInitiatives, filtering out AVISA/SGP-02 entries (BSF-R-10)', fakeAsync(() => {
      const resultsApiSE = TestBed.inject(ResultsApiService);
      jest.spyOn(resultsApiSE, 'GET_AllInitiatives').mockReturnValue(
        of({
          response: [
            { id: 1, official_code: 'SP01', short_name: 'Multifunctional Landscapes', name: 'Multifunctional Landscapes' },
            { id: 2, official_code: 'SP02', short_name: 'Diversification', name: 'Diversification' },
            { id: 41, official_code: 'SGP-02', short_name: 'AVISA', name: 'AVISA' },
          ],
        }),
      );

      recreateOn();
      tick();
      fixture.detectChanges();

      expect(resultsApiSE.GET_AllInitiatives).toHaveBeenCalledWith('P25');
      expect(component.programOptions().map(o => o.value)).toEqual(['SP01', 'SP02']);
      expect(component.programSelectOptions().map(o => o.value)).toEqual(['SP01', 'SP02']);
    }));

    it('renders the control without throwing and never blocks the rest of the popover when the catalog fails (BSF-R-10, Scenario "No Science Program options available")', fakeAsync(() => {
      const resultsApiSE = TestBed.inject(ResultsApiService);
      jest.spyOn(resultsApiSE, 'GET_AllInitiatives').mockReturnValue(throwError(() => new Error('catalog unavailable')));

      expect(() => {
        recreateOn();
        tick();
        fixture.detectChanges();
      }).not.toThrow();

      // Proves the failing request actually ran — `toEqual([])` below would also pass if the
      // catalog request never fired at all.
      expect(resultsApiSE.GET_AllInitiatives).toHaveBeenCalledWith('P25');
      expect(component.programSelectOptions()).toEqual([]);

      component.filterPopoverOpen.set(true);
      fixture.detectChanges();
      const popover = fixture.nativeElement.querySelector('div[role="dialog"][aria-label="Result filters"]');
      expect(popover).toBeTruthy();
      expect(popover.querySelector('.brl-filter-field[aria-label="Filter by science program"]')).toBeTruthy();
      // The other filters in the same popover render unaffected.
      expect(popover.querySelector('.brl-filter-field[aria-label="Filter by project"]')).toBeTruthy();
    }));

    it('writes ?program=SP01 to the URL on selection and removes only "program" on chip removal, leaving an active Project filter untouched (BSF-R-5, Scenarios "Filtering by one Science Program" / "Removing the filter via chip")', fakeAsync(() => {
      // An unrelated active filter (`project`) must survive both the write and the removal below.
      component.onProjectFilterChange([118]);
      tick();

      component.onProgramFilterChange(['SP01']);
      tick();
      fixture.detectChanges();

      expect(queryParams$.value['program']).toBe('SP01');
      expect(queryParams$.value['project']).toBe('118');

      // Real chip-click path — exercises `clearChip`'s `'program'` case, not `removeProgramFilter` directly.
      chipRemoveButton('Science Program: SP01')!.click();
      tick();
      fixture.detectChanges();

      expect(component.programFilter()).toEqual([]);
      expect('program' in queryParams$.value).toBe(false);
      expect(queryParams$.value['project']).toBe('118');
      expect(chipTexts().some(text => text.includes('Science Program:'))).toBe(false);
    }));
  });

  describe('Column resize and pagination', () => {
    const titleColumn = BILATERAL_COLUMNS.find(c => c.key === 'title')!;

    beforeEach(() => {
      component.initializing.set(false);
      component.loading.set(false);
      component.results.set(Array.from({ length: 12 }, (_v, i) => result({ id: i + 1, result_code: String(8700 + i) })));
      fixture.detectChanges();
    });

    it('resolves columnWidth from defaults and custom widths', () => {
      expect(component.columnWidth(titleColumn)).toBe('280px');
      component.customWidths.set({ title: 360 });
      expect(component.columnWidth(titleColumn)).toBe('360px');
    });

    it('persists resized column widths on mouseup', () => {
      const th = document.createElement('th');
      th.getBoundingClientRect = jest.fn(() => ({ width: 280 } as DOMRect));

      component.onResizeStart({ clientX: 100, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as MouseEvent, titleColumn, th);
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
      window.dispatchEvent(new MouseEvent('mouseup'));

      expect(component.customWidths().title).toBe(330);
      expect(JSON.parse(localStorage.getItem(BILATERAL_COLUMN_WIDTHS_STORAGE_KEY) || '{}').title).toBe(330);
    });

    it('resets a column width on double-click handler', () => {
      component.customWidths.set({ title: 400 });
      component.onResizeReset(titleColumn, { preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as MouseEvent);
      expect(component.customWidths().title).toBeUndefined();
    });

    it('configures pagination to render one page at a time with always-visible controls', () => {
      expect(component.table).toBeTruthy();
      const tableCmp = component.table!;
      expect(tableCmp.paginator).toBe(true);
      expect(tableCmp.showPaginatorAlways).toBe(true);
      expect(tableCmp.effectiveRows()).toBe(10);
      expect(tableCmp.rowsPerPageOptions).toEqual([10, 25, 50, 100]);
      expect(tableCmp.pagedValue()).toHaveLength(10);
      expect(tableCmp.showPaginator()).toBe(true);
    });

    it('does not sort when clicking the column resizer handle', () => {
      const resizer = fixture.nativeElement.querySelector('th .brl-col-resizer') as HTMLElement;
      expect(resizer).toBeTruthy();

      const sortSpy = jest.spyOn(component.table!, 'sort');
      resizer.click();
      expect(sortSpy).not.toHaveBeenCalled();
    });

    it('swallows the phantom click the browser fires after a resize drag ends over the header, without swallowing a later unrelated click', () => {
      const th = document.createElement('th');
      th.getBoundingClientRect = jest.fn(() => ({ width: 280 } as DOMRect));

      const sortSpy = jest.spyOn(component.table!, 'sort');

      component.onResizeStart({ clientX: 100, preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as MouseEvent, titleColumn, th);
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 }));
      window.dispatchEvent(new MouseEvent('mouseup'));

      // Stands in for the native click the browser synthesizes on <th> right after this drag's
      // mouseup — this is the click that would otherwise reach PrSortableColumnDirective/sort().
      const phantomClick = new MouseEvent('click', { bubbles: true, cancelable: true });
      document.dispatchEvent(phantomClick);
      expect(phantomClick.defaultPrevented).toBe(true);
      expect(sortSpy).not.toHaveBeenCalled();

      const laterUnrelatedClick = new MouseEvent('click', { bubbles: true, cancelable: true });
      document.dispatchEvent(laterUnrelatedClick);
      expect(laterUnrelatedClick.defaultPrevented).toBe(false);
    });
  });

  describe('BGT-T-3: Guided tour instrumentation', () => {
    it('renders data-guide="bilateral-tab-results" on the docked container (BGT-T-3, BGT-R-2, Gate D1)', () => {
      const dockedEl = fixture.nativeElement.querySelector('[data-guide="bilateral-tab-results"]');
      expect(dockedEl).toBeTruthy();
    });
  });
});
