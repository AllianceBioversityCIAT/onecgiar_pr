import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

import { ResultReviewDrawerComponent } from './result-review-drawer.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { BilateralResultsService } from '../../services/bilateral-results.service';
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';


// jsdom does not expose structuredClone; the component relies on it for snapshots.
if (typeof (globalThis as any).structuredClone !== 'function') {
  (globalThis as any).structuredClone = (value: any) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));
}

/**
 * Angular flushes component effects outside the fakeAsync zone, so timers scheduled from inside an
 * effect are real timers. This yields the event loop so those callbacks can run.
 */
const macrotask = (ms = 5) => new Promise(resolve => setTimeout(resolve, ms));

// @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-6)
/** Stand-in for the real `app-cp-multiple-wps` (declared in `RdContributorsAndPartnersModule`,
 *  a heavy dependency graph — see `result-review-drawer.approve-tooltip.cy.ts`'s mount decision
 *  and the file-wide `template: ''` override above). Same selector and inputs, so the rendered-proof
 *  tests below can assert real DOM presence/absence of the element the disqualifier requires
 *  ("assert DOM absence, never a class") without paying for the real component tree. */
@Component({
  selector: 'app-cp-multiple-wps',
  standalone: true,
  template: '<span>stub-multiple-wps</span>'
})
class StubCpMultipleWpsComponent {
  @Input() editable: any;
  @Input() initiative: any;
  @Input() initiativeId: any;
  @Input() resultLevelId: any;
  @Input() isIpsr: any;
  @Input() isContributor: any;
  @Input() isNotifications: any;
  @Input() isUnplanned: any;
  @Input() showMultipleWPsContent: any;
  @Input() hidden: any;
  @Input() forceP25: any;
}

describe('ResultReviewDrawerComponent', () => {
  let component: ResultReviewDrawerComponent;
  let fixture: ComponentFixture<ResultReviewDrawerComponent>;

  let apiMock: any;
  let rolesMock: any;
  let centersMock: any;
  let institutionsMock: any;
  let routerMock: any;
  let loadedInstitutions$: Subject<any>;

  const buildDetail = (overrides: any = {}): any => ({
    commonFields: {
      id: '101',
      result_code: 'RC-1',
      result_level_id: 1,
      result_type_id: 6,
      result_category: 'cat',
      result_title: 'A title',
      result_description: 'desc',
      status_id: 5
    },
    tocMetadata: null,
    geographicScope: null,
    contributingCenters: [],
    contributingInstitutions: [],
    contributingProjects: [],
    contributingInitiatives: [],
    evidence: [],
    resultTypeResponse: null,
    ...overrides
  });

  beforeEach(async () => {
    loadedInstitutions$ = new Subject<any>();

    apiMock = {
      rolesSE: { isAdmin: false },
      dataControlSE: {
        myInitiativesList: [],
        currentResult: null,
        currentResultSignal: { set: jest.fn() }
      },
      resultsSE: {
        currentResultId: null,
        PATCH_BilateralResultTitle: jest.fn(() => of({ response: {} })),
        PATCH_BilateralTocMetadata: jest.fn(() => of({ response: {} })),
        PATCH_BilateralDataStandard: jest.fn(() => of({ response: {} })),
        PATCH_BilateralReviewDecision: jest.fn(() => of({ response: {} })),
        GET_BilateralResultDetail: jest.fn(() => of({ response: buildDetail() })),
        GET_AllWithoutResults: jest.fn(() => of({ response: [] })),
        GET_ClarisaProjects: jest.fn(() => of({ response: [] }))
      }
    };

    rolesMock = { readOnly: true, isAdmin: false };
    centersMock = { centersList: [] as any[] };
    institutionsMock = {
      institutionsList: [{ institutions_id: 7, acronym: 'ACR', institution_name: 'Inst 7' }],
      loadedInstitutions: loadedInstitutions$.asObservable()
    };
    routerMock = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ResultReviewDrawerComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        { provide: RolesService, useValue: rolesMock },
        { provide: CentersService, useValue: centersMock },
        { provide: InstitutionsService, useValue: institutionsMock },
        { provide: Router, useValue: routerMock }
      ]
    })
      .overrideComponent(ResultReviewDrawerComponent, {
        set: { template: '', imports: [], styles: [], changeDetection: ChangeDetectionStrategy.Default }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ResultReviewDrawerComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------- formatter

  describe('contributingInitiativesFormatter', () => {
    it('returns empty string when option is falsy', () => {
      expect(component.contributingInitiativesFormatter(null)).toBe('');
      expect(component.contributingInitiativesFormatter(undefined)).toBe('');
    });

    it('returns "code - name" when both present', () => {
      expect(component.contributingInitiativesFormatter({ official_code: 'SP01', initiative_name: 'Breeding' })).toBe('SP01 - Breeding');
    });

    it('falls back to acronym/short_name', () => {
      expect(component.contributingInitiativesFormatter({ acronym: 'AC', short_name: 'Short' })).toBe('AC - Short');
    });

    it('returns name only when code is missing', () => {
      expect(component.contributingInitiativesFormatter({ name: 'Only name' })).toBe('Only name');
    });

    it('returns code only when name is missing', () => {
      expect(component.contributingInitiativesFormatter({ official_code: 'SP09' })).toBe('SP09');
    });

    it('falls back to full_name as the name', () => {
      expect(component.contributingInitiativesFormatter({ full_name: 'Full' })).toBe('Full');
    });

    it('returns empty string when the object is empty', () => {
      expect(component.contributingInitiativesFormatter({})).toBe('');
    });
  });

  // ------------------------------------------------- disabledContributingProjectOptions

  describe('disabledContributingProjectOptions', () => {
    it('returns [] when there are no lead ids', () => {
      component.clarisaProjectsList.set([{ id: 1 }]);
      expect(component.disabledContributingProjectOptions()).toEqual([]);
    });

    it('returns [] when the project list is empty', () => {
      component.leadProjectIds.set(['1']);
      component.clarisaProjectsList.set([]);
      expect(component.disabledContributingProjectOptions()).toEqual([]);
    });

    it('filters projects by project_id and id', () => {
      component.leadProjectIds.set(['1', '2']);
      component.clarisaProjectsList.set([{ project_id: '1' }, { id: 2 }, { id: 3 }, {}]);
      expect(component.disabledContributingProjectOptions().length).toBe(2);
    });
  });

  // ------------------------------------------------------------- isTocFormValid

  describe('isTocFormValid', () => {
    it('is false when there are no result_toc_results', () => {
      component.tocInitiative = { result_toc_results: [] };
      expect(component.isTocFormValid()).toBe(false);
    });

    it('is false when tocInitiative is null', () => {
      component.tocInitiative = null;
      expect(component.isTocFormValid()).toBe(false);
    });

    it('is false when toc_level_id is missing', () => {
      component.tocInitiative = { result_toc_results: [{ toc_level_id: null, toc_result_id: 1 }] };
      expect(component.isTocFormValid()).toBe(false);
    });

    it('is false when toc_result_id is missing', () => {
      component.tocInitiative = { result_toc_results: [{ toc_level_id: 1, toc_result_id: null }] };
      expect(component.isTocFormValid()).toBe(false);
    });

    it('is false when the first indicator lacks related_node_id', () => {
      component.tocInitiative = {
        result_toc_results: [{ toc_level_id: 1, toc_result_id: 2, indicators: [{ related_node_id: null }] }]
      };
      expect(component.isTocFormValid()).toBe(false);
    });

    it('is true with complete data (and with an empty indicators array)', () => {
      component.tocInitiative = {
        result_toc_results: [
          { toc_level_id: 1, toc_result_id: 2, indicators: [{ related_node_id: 9 }] },
          { toc_level_id: 3, toc_result_id: 4, indicators: [] }
        ]
      };
      expect(component.isTocFormValid()).toBe(true);
    });
  });

  // ------------------------------------------------------ validateIsToCCompleted

  describe('validateIsToCCompleted', () => {
    it('sets completed when planned_result is false', () => {
      component.tocInitiative = { planned_result: false, result_toc_results: [] };
      component.validateIsToCCompleted();
      expect(component.isToCCompleted()).toBe(true);
    });

    it('sets NOT completed when planned_result is null', () => {
      component.tocInitiative = { planned_result: null, result_toc_results: [] };
      component.validateIsToCCompleted();
      expect(component.isToCCompleted()).toBe(false);
    });

    it('sets NOT completed when a tab lacks toc_level_id', () => {
      component.tocInitiative = {
        planned_result: true,
        result_toc_results: [{ toc_level_id: null, toc_result_id: 1, indicators: [] }]
      };
      component.validateIsToCCompleted();
      expect(component.isToCCompleted()).toBe(false);
    });

    it('sets NOT completed when a tab lacks toc_result_id', () => {
      component.tocInitiative = {
        planned_result: true,
        result_toc_results: [{ toc_level_id: 1, toc_result_id: undefined, indicators: [] }]
      };
      component.validateIsToCCompleted();
      expect(component.isToCCompleted()).toBe(false);
    });

    it('sets NOT completed when planned_result is true and the indicator has no toc_results_indicator_id', () => {
      component.tocInitiative = {
        planned_result: true,
        result_toc_results: [{ toc_level_id: 1, toc_result_id: 2, indicators: [{ toc_results_indicator_id: null }] }]
      };
      component.validateIsToCCompleted();
      expect(component.isToCCompleted()).toBe(false);
    });

    it('sets completed when planned_result is true and everything is filled', () => {
      component.tocInitiative = {
        planned_result: true,
        result_toc_results: [{ toc_level_id: 1, toc_result_id: 2, indicators: [{ toc_results_indicator_id: 55 }] }]
      };
      component.validateIsToCCompleted();
      expect(component.isToCCompleted()).toBe(true);
    });

    it('sets completed when planned_result is a truthy non-boolean and indicators is empty', () => {
      component.tocInitiative = {
        planned_result: 1,
        result_toc_results: [{ toc_level_id: 1, toc_result_id: 2, indicators: [] }]
      };
      component.validateIsToCCompleted();
      expect(component.isToCCompleted()).toBe(true);
    });
  });

  // -------------------------------------------------------------------- toNum

  describe('toNum', () => {
    it('handles null / undefined / strings / numbers / NaN', () => {
      const toNum = (v: any) => (component as any).toNum(v);
      expect(toNum(null)).toBeNull();
      expect(toNum(undefined)).toBeNull();
      expect(toNum('42')).toBe(42);
      expect(toNum(7)).toBe(7);
      expect(toNum('abc')).toBeNull();
      expect(toNum({})).toBeNull();
    });
  });

  // ------------------------------------------- normalizeDataStandardForComparison

  describe('normalizeDataStandardForComparison', () => {
    const norm = (detail: any) => (component as any).normalizeDataStandardForComparison(detail);

    it('returns {} for a null detail', () => {
      expect(norm(null)).toEqual({});
    });

    it('normalizes non-array collections into empty lists', () => {
      const result: any = norm({
        commonFields: null,
        contributingCenters: 'nope',
        contributingProjects: null,
        contributingInitiatives: undefined,
        contributingInstitutions: {},
        evidence: null,
        geographicScope: null,
        resultTypeResponse: null
      });
      expect(result.contributingCenters).toEqual([]);
      expect(result.contributingProjects).toEqual([]);
      expect(result.contributingInitiatives).toEqual([]);
      expect(result.contributingInstitutions).toEqual([]);
      expect(result.evidence).toEqual([]);
      expect(result.geographicScope).toBeNull();
      expect(result.resultTypeResponse).toBeNull();
      expect(result.result_description).toBeNull();
      expect(result.result_type_id).toBeNull();
    });

    it('normalizes each collection shape', () => {
      const result: any = norm({
        commonFields: { result_description: 'd', result_type_id: 2 },
        contributingCenters: ['B', { code: 'A' }, { nothing: true }],
        contributingProjects: ['2', 1, { project_id: '3' }, { id: '4' }, { other: true }],
        contributingInitiatives: [3, { id: '1' }, 'x', null],
        contributingInstitutions: [5, { institutions_id: 2 }, { institution_id: 4 }, { id: 3 }, 'no'],
        evidence: [{ id: 1, link: 'l1', is_sharepoint: 1 }, { evidence_link: 'l2' }, {}],
        geographicScope: { regions: [] },
        resultTypeResponse: [{ a: 1 }]
      });
      expect(result.contributingCenters).toEqual(['A', 'B']);
      expect(result.contributingProjects).toEqual(['1', '2', '3', '4']);
      expect(result.contributingInitiatives).toEqual([1, 3]);
      expect(result.contributingInstitutions).toEqual([2, 3, 4, 5]);
      expect(result.evidence).toEqual([
        { id: 1, link: 'l1', is_sharepoint: 1 },
        { id: null, link: 'l2', is_sharepoint: 0 },
        { id: null, link: '', is_sharepoint: 0 }
      ]);
      expect(result.geographicScope).toEqual({ regions: [] });
      expect(result.resultTypeResponse).toEqual({ a: 1 });
      expect(result.result_description).toBe('d');
      expect(result.result_type_id).toBe(2);
    });

    it('returns a null resultTypeResponse when the array is empty', () => {
      const result: any = norm({ commonFields: {}, resultTypeResponse: [] });
      expect(result.resultTypeResponse).toBeNull();
    });
  });

  // ---------------------------------------------------- unsaved-changes helpers

  describe('unsaved changes helpers', () => {
    it('hasDataStandardUnsavedChanges is false without a snapshot', () => {
      expect(component.hasDataStandardUnsavedChanges()).toBe(false);
    });

    it('is false right after capturing and true after mutating', () => {
      component.resultDetail.set(buildDetail());
      (component as any).captureDataStandardSnapshot();
      expect(component.hasDataStandardUnsavedChanges()).toBe(false);

      component.resultDetail.set(buildDetail({ commonFields: { id: '101', result_description: 'other', result_type_id: 6 } }));
      expect(component.hasDataStandardUnsavedChanges()).toBe(true);
    });

    it('tracks the toc dirty flag', () => {
      expect(component.hasTocUnsavedChanges()).toBe(false);
      component.markTocAsDirty();
      expect(component.hasTocUnsavedChanges()).toBe(true);
    });
  });

  describe('canApprove / getApproveButtonTooltip', () => {
    it('cannot approve when the TOC is incomplete', () => {
      component.isToCCompleted.set(false);
      expect(component.canApprove()).toBe(false);
      expect(component.getApproveButtonTooltip()).toContain('complete and save the TOC');
    });

    it('cannot approve with unsaved TOC changes', () => {
      component.isToCCompleted.set(true);
      component.markTocAsDirty();
      expect(component.canApprove()).toBe(false);
      expect(component.getApproveButtonTooltip()).toContain('save the TOC changes');
    });

    it('cannot approve with unsaved data-standard changes', () => {
      component.isToCCompleted.set(true);
      component.resultDetail.set(buildDetail());
      (component as any).captureDataStandardSnapshot();
      component.resultDetail.set(buildDetail({ evidence: [{ link: 'new' }] }));
      expect(component.canApprove()).toBe(false);
      expect(component.getApproveButtonTooltip()).toContain('Data Standards');
    });

    it('can approve when everything is clean', () => {
      component.isToCCompleted.set(true);
      expect(component.canApprove()).toBe(true);
      expect(component.getApproveButtonTooltip()).toBe('');
    });
  });

  // --------------------------------------- BIL-RTE-T-7 attempt 2 (Reviewer FAIL remediation)
  //
  // Attempt 1 proved the admin click mutates `body.has_regions` (CT, GeoscopeManagementComponent)
  // and pinned the drawer's two `app-geoscope-management` call sites by reading the real HTML off
  // disk. Neither proved the SAVE side of R-1.b: that the exact mutation the admin's click performs
  // (`has_regions` flipped on `resultDetail().geographicScope`, the SAME object `[body]` binds to)
  // actually marks `hasDataStandardUnsavedChanges()` dirty and enables the rendered "Save data
  // standards" button — and the Reviewer flagged that gap. Full reasoning and attempt history:
  // `docs/specs/bilateral/review-toc-only-editing/execution.md` §BIL-RTE-T-7.
  describe('Save data standards — R-1.b behavioral proof (BIL-RTE-T-7 attempt 2)', () => {
    // (a) LOGIC: the admin's geography mutation dirties the snapshot and blocks Approve. This is
    // the same mechanism `getApproveButtonTooltip`'s "unsaved data-standard changes" test above
    // exercises with `evidence`; here the mutated field is `geographicScope.has_regions` — the
    // EXACT field `GeoscopeManagementComponent`'s `app-pr-yes-or-not` two-way-binds via
    // `[(ngModel)]="this.body.has_regions"` when the admin clicks "Yes" (see the CT spec's test
    // (b), same folder). FALSIFIER for this test is run manually below (not re-asserted here): if
    // `geographicScope` is ever dropped from `normalizeDataStandardForComparison`
    // (`result-review-drawer.component.ts:420,433`), this exact test goes red — verified by a
    // temporary local edit + revert, see the Implementer's verification report.
    it('(a) the admin geography mutation dirties the snapshot and blocks Approve', () => {
      component.isToCCompleted.set(true);
      component.resultDetail.set(buildDetail({ geographicScope: { geo_scope_id: 1, has_regions: undefined, regions: [], countries: [] } }));
      (component as any).captureDataStandardSnapshot();
      expect(component.hasDataStandardUnsavedChanges()).toBe(false);

      // The exact mutation `pr-yes-or-not.onclickYes()` performs through the two-way binding —
      // `this.body.has_regions = true` on the SAME object reference `resultDetail().geographicScope`.
      component.resultDetail().geographicScope.has_regions = true;

      expect(component.hasDataStandardUnsavedChanges()).toBe(true);
      expect(component.canApprove()).toBe(false);
    });

    // (b) RENDERED: mounts the REAL "Save data standards" block — extracted from the shipped
    // template at test time (never hand-typed, so this cannot silently drift from what ships) —
    // in place of the file-wide `template: ''` override every other test in this file uses. That
    // override exists because the FULL drawer template pulls in ~5 child-component dependency
    // graphs behind ApiService (documented in `result-review-drawer.approve-tooltip.cy.ts`'s mount
    // decision); this one `@if` block has no such dependency — it is `div`/`span`/`button`/`i`
    // only — so it renders cleanly in jsdom without that cost.
    describe('rendered proof', () => {
      const TEMPLATE_PATH = path.join(__dirname, 'result-review-drawer.component.html');

      /** Reads the exact shipped block, brace-matched from the marker comment to its own close —
       * same technique `BSR-T-5: drawer header Source` above uses, not a substring/regex lock. */
      const extractSaveButtonBlock = (): string => {
        const html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
        const marker = '<!-- Admin Save Changes for Data Standards -->';
        const markerIndex = html.indexOf(marker);
        expect(markerIndex).toBeGreaterThan(-1);
        const ifMarker = '@if (canEditDataStandards()) {';
        const ifIndex = html.indexOf(ifMarker, markerIndex);
        expect(ifIndex).toBeGreaterThan(-1);
        let depth = 1;
        let cursor = ifIndex + ifMarker.length;
        for (; cursor < html.length && depth > 0; cursor++) {
          if (html[cursor] === '{') depth++;
          else if (html[cursor] === '}') depth--;
        }
        expect(depth).toBe(0);
        return html.slice(markerIndex, cursor);
      };

      let saveFixture: ComponentFixture<ResultReviewDrawerComponent>;
      let saveComponent: ResultReviewDrawerComponent;

      beforeEach(async () => {
        const block = extractSaveButtonBlock();
        expect(block).toContain('Save data standards');
        expect(block).toContain('[disabled]="!hasDataStandardUnsavedChanges() || isSaving() || !isGeoScopeCompleted()"');

        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
          imports: [ResultReviewDrawerComponent],
          providers: [
            { provide: ApiService, useValue: apiMock },
            { provide: RolesService, useValue: rolesMock },
            { provide: CentersService, useValue: centersMock },
            { provide: InstitutionsService, useValue: institutionsMock },
            { provide: Router, useValue: routerMock }
          ]
        })
          .overrideComponent(ResultReviewDrawerComponent, {
            set: { template: block, imports: [], styles: [], changeDetection: ChangeDetectionStrategy.Default }
          })
          .compileComponents();

        saveFixture = TestBed.createComponent(ResultReviewDrawerComponent);
        saveComponent = saveFixture.componentInstance;
      });

      it('(b) as admin, after the mutation, "Save data standards" is present and its button is enabled', () => {
        apiMock.rolesSE.isAdmin = true;
        saveComponent.resultDetail.set(
          buildDetail({ geographicScope: { geo_scope_id: 1, has_regions: undefined, regions: [], countries: [] } })
        );
        (saveComponent as any).captureDataStandardSnapshot();
        saveComponent.resultDetail().geographicScope.has_regions = true; // the admin's click
        saveFixture.detectChanges();

        const host: HTMLElement = saveFixture.nativeElement;
        expect(host.textContent).toContain('Save data standards');
        const button = host.querySelector('button');
        expect(button).toBeTruthy();
        expect((button as HTMLButtonElement).disabled).toBe(false);
      });

      it('(b) FALSIFIER — the whole block is absent when canEditDataStandards() is false (non-admin)', () => {
        apiMock.rolesSE.isAdmin = false;
        apiMock.dataControlSE.myInitiativesList = [{ official_code: 'SP01' }];
        TestBed.inject(BilateralResultsService).entityId.set('SP01');
        saveComponent.resultToReview.set({ id: '1', status_id: 5 } as any);
        saveComponent.resultDetail.set(
          buildDetail({ geographicScope: { geo_scope_id: 1, has_regions: undefined, regions: [], countries: [] } })
        );
        (saveComponent as any).captureDataStandardSnapshot();
        saveFixture.detectChanges();

        const host: HTMLElement = saveFixture.nativeElement;
        expect(host.textContent).not.toContain('Save data standards');
        expect(host.querySelector('button')).toBeNull();
      });
    });
  });

  // @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-6)
  // RENDERED proof that `app-cp-multiple-wps` is genuinely absent from the DOM (not merely CSS
  // hidden) on a P25-onward No, and present otherwise — the disqualifier requires DOM absence,
  // never a class. Mounts the REAL shipped block, extracted from the template at test time (same
  // brace-matching technique the T-7 "rendered proof" block above uses), with a stub
  // `app-cp-multiple-wps` standing in for the real (heavy) one.
  describe('P25-onward ToC block rendering — rendered proof (BIL-RTE-T-6, R-7.a/b/c, R-11)', () => {
    const TEMPLATE_PATH = path.join(__dirname, 'result-review-drawer.component.html');

    /** Reads the exact shipped block, brace-matched from the marker comment through BOTH the
     *  cp-multiple-wps gating `@if` and the immediately-following missing-initiative-message `@if`
     *  — same technique T-7's "rendered proof" block above uses (never hand-typed, so this cannot
     *  silently drift from what ships). */
    const braceMatchIf = (html: string, ifMarker: string, fromIndex: number): { ifIndex: number; endIndex: number } => {
      const ifIndex = html.indexOf(ifMarker, fromIndex);
      expect(ifIndex).toBeGreaterThan(-1);
      const openBraceIndex = html.indexOf('{', ifIndex);
      let depth = 1;
      let cursor = openBraceIndex + 1;
      for (; cursor < html.length && depth > 0; cursor++) {
        if (html[cursor] === '{') depth++;
        else if (html[cursor] === '}') depth--;
      }
      expect(depth).toBe(0);
      return { ifIndex, endIndex: cursor };
    };

    const extractTocGatingBlock = (): string => {
      const html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
      const marker = '<!-- @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-6, R-7.a/b, R-11) -->';
      const markerIndex = html.indexOf(marker);
      expect(markerIndex).toBeGreaterThan(-1);

      const gatingBlock = braceMatchIf(html, '@if (tocInitiative?.planned_result !== null', markerIndex);
      const messageBlock = braceMatchIf(html, '@if (tocInitiativeMissingMessage())', gatingBlock.endIndex);

      return html.slice(gatingBlock.ifIndex, messageBlock.endIndex);
    };

    let gateFixture: ComponentFixture<ResultReviewDrawerComponent>;
    let gateComponent: ResultReviewDrawerComponent;

    beforeEach(async () => {
      const block = extractTocGatingBlock();
      expect(block).toContain('app-cp-multiple-wps');
      expect(block).toContain('isP25Onward()');

      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [ResultReviewDrawerComponent],
        providers: [
          { provide: ApiService, useValue: apiMock },
          { provide: RolesService, useValue: rolesMock },
          { provide: CentersService, useValue: centersMock },
          { provide: InstitutionsService, useValue: institutionsMock },
          { provide: Router, useValue: routerMock }
        ]
      })
        .overrideComponent(ResultReviewDrawerComponent, {
          set: { template: block, imports: [StubCpMultipleWpsComponent], styles: [], changeDetection: ChangeDetectionStrategy.Default }
        })
        .compileComponents();

      gateFixture = TestBed.createComponent(ResultReviewDrawerComponent);
      gateComponent = gateFixture.componentInstance;
    });

    it('FALSIFIER 1 — P25-onward (2025) + No: no app-cp-multiple-wps in the DOM', () => {
      gateComponent.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2025 } }));
      gateComponent.tocInitiative = { planned_result: false, initiative_id: 1, result_toc_results: [] };
      gateFixture.detectChanges();

      const host: HTMLElement = gateFixture.nativeElement;
      expect(host.querySelector('app-cp-multiple-wps')).toBeNull();
    });

    it('FALSIFIER 2 — pre-P25 (2022) + No: present, as today', () => {
      gateComponent.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2022 } }));
      gateComponent.tocInitiative = { planned_result: false, initiative_id: 1, result_toc_results: [] };
      gateFixture.detectChanges();

      const host: HTMLElement = gateFixture.nativeElement;
      expect(host.querySelector('app-cp-multiple-wps')).not.toBeNull();
    });

    it('FALSIFIER 3 — portfolio_start_year null + No: present (not P25-onward)', () => {
      gateComponent.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: null } }));
      gateComponent.tocInitiative = { planned_result: false, initiative_id: 1, result_toc_results: [] };
      gateFixture.detectChanges();

      const host: HTMLElement = gateFixture.nativeElement;
      expect(host.querySelector('app-cp-multiple-wps')).not.toBeNull();
    });

    it('P25-onward + Yes: present, level/HLO/indicator fields shown as today', () => {
      gateComponent.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2025 } }));
      gateComponent.tocInitiative = { planned_result: true, initiative_id: 1, result_toc_results: [] };
      gateFixture.detectChanges();

      const host: HTMLElement = gateFixture.nativeElement;
      expect(host.querySelector('app-cp-multiple-wps')).not.toBeNull();
    });

    it('unanswered (planned_result null) stays absent regardless of portfolio year (R-11)', () => {
      gateComponent.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2025 } }));
      gateComponent.tocInitiative = { planned_result: null, initiative_id: 1, result_toc_results: [] };
      gateFixture.detectChanges();

      const host: HTMLElement = gateFixture.nativeElement;
      expect(host.querySelector('app-cp-multiple-wps')).toBeNull();
    });

    it('FALSIFIER — the missing-initiative message is present when set, absent otherwise', () => {
      gateComponent.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2025 } }));
      gateComponent.tocInitiative = { planned_result: true, initiative_id: 1, result_toc_results: [] };
      gateFixture.detectChanges();
      expect(gateFixture.nativeElement.querySelector('[data-testid="toc-initiative-missing-message"]')).toBeNull();

      gateComponent.tocInitiativeMissingMessage.set('We could not determine which program this ToC belongs to.');
      gateFixture.detectChanges();
      const messageEl = gateFixture.nativeElement.querySelector('[data-testid="toc-initiative-missing-message"]');
      expect(messageEl).not.toBeNull();
      expect(messageEl.textContent).toContain('We could not determine');
    });
  });

  // -------------------------------------------------------------- getTocMetadata

  describe('getTocMetadata', () => {
    it('returns null when there is no detail', () => {
      expect(component.getTocMetadata()).toBeNull();
    });

    it('returns null when tocMetadata is missing', () => {
      component.resultDetail.set(buildDetail({ tocMetadata: null }));
      expect(component.getTocMetadata()).toBeNull();
    });

    it('returns the first element for arrays', () => {
      component.resultDetail.set(buildDetail({ tocMetadata: [{ a: 1 }, { a: 2 }] }));
      expect(component.getTocMetadata()).toEqual({ a: 1 });
    });

    it('returns the object itself when it is not an array', () => {
      component.resultDetail.set(buildDetail({ tocMetadata: { a: 3 } }));
      expect(component.getTocMetadata()).toEqual({ a: 3 });
    });
  });

  it('getTocAlertDescription returns copy', () => {
    expect(component.getTocAlertDescription()).toContain('adaptive management');
  });

  // ------------------------------------------------- isP25Onward (BIL-RTE-T-6, R-7.c)

  describe('isP25Onward', () => {
    it('is false when there is no result detail at all', () => {
      expect(component.isP25Onward()).toBe(false);
    });

    it('is true for portfolio_start_year 2025', () => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2025 } }));
      expect(component.isP25Onward()).toBe(true);
    });

    it('is true for a year after 2025', () => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2030 } }));
      expect(component.isP25Onward()).toBe(true);
    });

    it('is false for portfolio_start_year 2022 (pre-P25)', () => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2022 } }));
      expect(component.isP25Onward()).toBe(false);
    });

    it('is false when portfolio_start_year is null — never treated as P25-onward', () => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: null } }));
      expect(component.isP25Onward()).toBe(false);
    });

    it('is false when portfolio_start_year is missing entirely', () => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101' } }));
      expect(component.isP25Onward()).toBe(false);
    });
  });

  describe('getPlannedResultHelperText / getTocAlertDescription — P25-onward copy (R-10)', () => {
    it('helper text does not ask to choose an HLO on No when P25-onward', () => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2025 } }));
      const text = component.getPlannedResultHelperText();
      expect(text.toLowerCase()).not.toContain('choose the hlo');
    });

    it('helper text keeps asking to choose an HLO on No when pre-P25', () => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2022 } }));
      const text = component.getPlannedResultHelperText();
      expect(text.toLowerCase()).toContain('choose the hlo');
    });

    it('getTocAlertDescription drops the HLO/level ask when P25-onward', () => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2025 } }));
      const text = component.getTocAlertDescription();
      expect(text).not.toContain('choose the <strong>HLO</strong>');
    });

    it('getTocAlertDescription keeps the HLO/level ask when pre-P25', () => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2022 } }));
      const text = component.getTocAlertDescription();
      expect(text).toContain('choose the <strong>HLO</strong>');
    });
  });

  // ------------------------------------------------------------- canEditInDrawer

  describe('canEditInDrawer', () => {
    it('is true for admins', () => {
      apiMock.rolesSE.isAdmin = true;
      expect(component.canEditInDrawer()).toBe(true);
    });

    it('is false when the status is not 5', () => {
      component.resultToReview.set({ id: '1', status_id: 2 } as any);
      expect(component.canEditInDrawer()).toBe(false);
    });

    it('falls back to the detail status and is false without a matching initiative', () => {
      component.resultDetail.set(buildDetail());
      expect(component.canEditInDrawer()).toBe(false);
    });

    it('is true when the user owns the entity', () => {
      apiMock.dataControlSE.myInitiativesList = [{ official_code: 'SP01' }];
      TestBed.inject(BilateralResultsService).entityId.set('SP01');
      component.resultToReview.set({ id: '1', status_id: 5 } as any);
      expect(component.canEditInDrawer()).toBe(true);
    });

    it('is false when myInitiativesList is missing', () => {
      apiMock.dataControlSE.myInitiativesList = null;
      component.resultToReview.set({ id: '1', status_id: 5 } as any);
      expect(component.canEditInDrawer()).toBe(false);
    });

    // BRT-T-2 (BRT-R-14): the shared BilateralReviewAccessService rule and the drawer's own
    // status_id == 5 guard must both hold, in either order.
    it('is false for a program member when the row is not pending (status_id 6)', () => {
      apiMock.dataControlSE.myInitiativesList = [{ official_code: 'SP01' }];
      TestBed.inject(BilateralResultsService).entityId.set('SP01');
      component.resultToReview.set({ id: '1', status_id: 6 } as any);
      expect(component.canEditInDrawer()).toBe(false);
    });

    it('is true for a program member when the row is pending (status_id 5)', () => {
      apiMock.dataControlSE.myInitiativesList = [{ official_code: 'SP01' }];
      TestBed.inject(BilateralResultsService).entityId.set('SP01');
      component.resultToReview.set({ id: '1', status_id: 5 } as any);
      expect(component.canEditInDrawer()).toBe(true);
    });

    it('is false for a non-member on a pending row (status_id 5)', () => {
      apiMock.dataControlSE.myInitiativesList = [{ official_code: 'SP99' }];
      TestBed.inject(BilateralResultsService).entityId.set('SP01');
      component.resultToReview.set({ id: '1', status_id: 5 } as any);
      expect(component.canEditInDrawer()).toBe(false);
    });
  });

  // ------------------------------------------------- P2-3154 exclusive TOC editing

  describe('canEditDataStandards (P2-3154)', () => {
    /** Puts the component in the exact scenario AC1 describes: SP Leader, result pending review. */
    const asReviewingScienceProgram = () => {
      apiMock.rolesSE.isAdmin = false;
      apiMock.dataControlSE.myInitiativesList = [{ official_code: 'SP01' }];
      TestBed.inject(BilateralResultsService).entityId.set('SP01');
      component.resultToReview.set({ id: '1', status_id: 5 } as any);
    };

    it('AC2 — the SP Leader keeps the TOC alignment editable', () => {
      asReviewingScienceProgram();
      expect(component.canEditInDrawer()).toBe(true);
    });

    it('AC1 — but every Minimum Data Standard field is locked for that same SP Leader', () => {
      asReviewingScienceProgram();
      expect(component.canEditDataStandards()).toBe(false);
    });

    it('AC1 — the title cannot be edited even if startEditingTitle is called directly', () => {
      asReviewingScienceProgram();
      component.resultDetail.set(buildDetail());
      component.startEditingTitle();
      expect(component.isEditingTitle()).toBe(false);
    });

    it('AC1 — the Data Standards save is refused for the SP Leader', () => {
      asReviewingScienceProgram();
      component.onSaveDataStandardChanges();
      expect(component.saveChangesType).toBeNull();
      expect(component.showConfirmSaveChangesDialog()).toBe(false);
    });

    it('AC2 — the TOC save still works for the SP Leader', () => {
      asReviewingScienceProgram();
      component.tocInitiative = { planned_result: true };
      component.onSaveTocChanges();
      expect(component.saveChangesType).toBe('toc');
      expect(component.showConfirmSaveChangesDialog()).toBe(true);
    });

    it('platform administrators are out of scope and keep full editing', () => {
      apiMock.rolesSE.isAdmin = true;
      expect(component.canEditDataStandards()).toBe(true);
    });
  });

  // ------------------------------------------------------------------- toc edits

  describe('toc edit handlers', () => {
    it('onPlannedResultChangeValue does nothing without tocInitiative', () => {
      component.tocInitiative = null;
      expect(() => component.onPlannedResultChangeValue(true)).not.toThrow();
    });

    it('onPlannedResultChangeValue assigns the value', () => {
      component.onPlannedResultChangeValue(true);
      expect(component.tocInitiative.planned_result).toBe(true);
    });

    it('onTocProgressiveNarrativeChange does nothing without tocInitiative', () => {
      component.tocInitiative = null;
      expect(() => component.onTocProgressiveNarrativeChange('x')).not.toThrow();
    });

    it('onTocProgressiveNarrativeChange propagates to the first tab', () => {
      component.onTocProgressiveNarrativeChange('narrative');
      expect(component.tocInitiative.toc_progressive_narrative).toBe('narrative');
      expect(component.tocInitiative.result_toc_results[0].toc_progressive_narrative).toBe('narrative');
    });

    it('onTocProgressiveNarrativeChange survives an empty tab list', () => {
      component.tocInitiative = { result_toc_results: [] };
      component.onTocProgressiveNarrativeChange('n');
      expect(component.tocInitiative.toc_progressive_narrative).toBe('n');
    });

    it('onPlannedResultChange does nothing without tocInitiative', () => {
      component.tocInitiative = null;
      expect(() => component.onPlannedResultChange()).not.toThrow();
    });

    it('onPlannedResultChange clears tabs and restores tocConsumed', fakeAsync(() => {
      component.tocInitiative = {
        result_toc_results: [
          { toc_level_id: 1, toc_result_id: 2, indicators: [{ related_node_id: 1, toc_results_indicator_id: 2, targets: [{ contributing_indicator: 5 }] }] },
          { toc_level_id: 3, toc_result_id: 4, indicators: [{ related_node_id: 1, toc_results_indicator_id: 2 }] },
          { toc_level_id: 5, toc_result_id: 6, indicators: [] }
        ]
      };
      component.onPlannedResultChange();
      expect(component.tocConsumed()).toBe(false);
      expect(component.tocInitiative.result_toc_results[0].indicators[0].targets[0].contributing_indicator).toBeNull();
      expect(component.tocInitiative.result_toc_results[1].toc_level_id).toBeNull();
      tick(100);
      expect(component.tocConsumed()).toBe(true);
    }));

    it('onPlannedResultChange handles a missing result_toc_results', fakeAsync(() => {
      component.tocInitiative = {};
      component.onPlannedResultChange();
      tick(100);
      expect(component.tocConsumed()).toBe(true);
    }));
  });

  // ----------------------------------------------------------------- title edit

  describe('title editing', () => {
    it('startEditingTitle uses the current title or an empty fallback', () => {
      // P2-3154: the title is only editable by a platform administrator.
      apiMock.rolesSE.isAdmin = true;
      component.startEditingTitle();
      expect(component.editingTitleValue()).toBe('');
      expect(component.isEditingTitle()).toBe(true);

      component.resultDetail.set(buildDetail());
      component.startEditingTitle();
      expect(component.editingTitleValue()).toBe('A title');
    });

    it('cancelEditingTitle resets state', () => {
      component.isEditingTitle.set(true);
      component.editingTitleValue.set('x');
      component.cancelEditingTitle();
      expect(component.isEditingTitle()).toBe(false);
      expect(component.editingTitleValue()).toBe('');
    });

    it('confirmEditingTitle bails on an empty value', () => {
      component.isEditingTitle.set(true);
      component.editingTitleValue.set('   ');
      component.confirmEditingTitle();
      expect(component.isEditingTitle()).toBe(false);
      expect(apiMock.resultsSE.PATCH_BilateralResultTitle).not.toHaveBeenCalled();
    });

    it('confirmEditingTitle bails when the title did not change', () => {
      component.resultDetail.set(buildDetail());
      component.isEditingTitle.set(true);
      component.editingTitleValue.set(' A title ');
      component.confirmEditingTitle();
      expect(component.isEditingTitle()).toBe(false);
      expect(apiMock.resultsSE.PATCH_BilateralResultTitle).not.toHaveBeenCalled();
    });

    it('confirmEditingTitle patches and updates the table on success', () => {
      const service = TestBed.inject(BilateralResultsService);
      service.tableData.set([
        { project_id: 'p', project_name: 'p', results: [{ id: '101', result_title: 'old' } as any, { id: '999', result_title: 'keep' } as any] }
      ] as any);
      component.resultDetail.set(buildDetail());
      component.editingTitleValue.set('New title');

      component.confirmEditingTitle();

      expect(apiMock.resultsSE.PATCH_BilateralResultTitle).toHaveBeenCalledWith('101', { title: 'New title' });
      expect(component.isEditingTitle()).toBe(false);
      expect(component.resultDetail()?.commonFields.result_title).toBe('New title');
      expect(service.tableData()[0].results[0].result_title).toBe('New title');
      expect(service.tableData()[0].results[1].result_title).toBe('keep');
    });

    it('confirmEditingTitle handles the error branch', () => {
      apiMock.resultsSE.PATCH_BilateralResultTitle.mockReturnValue(throwError(() => new Error('boom')));
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      component.resultDetail.set(buildDetail());
      component.isEditingTitle.set(true);
      component.editingTitleValue.set('Another');

      component.confirmEditingTitle();

      expect(component.isEditingTitle()).toBe(false);
    });
  });

  // ------------------------------------------------------------ save dialogs

  /**
   * P2-3620 AC1 — "Given a bilateral result in edit mode, When the researcher tries to save
   * Geographic Location without selecting a scope, Then the system prevents saving."
   *
   * QA reproduced the opposite on prtest v49 (draft 9100): the justification modal opened, the save
   * persisted, and a reload showed the scope still blank while "# of people trained", touched in
   * the same save, kept its new value. The scope was silently written as null.
   */
  describe('required geographic scope gates the save (P2-3620)', () => {
    const asAdminWithScope = (geographicScope: any) => {
      apiMock.rolesSE.isAdmin = true;
      component.resultToReview.set({ id: '1', status_id: 5 } as any);
      component.resultDetail.set(buildDetail({ geographicScope }));
    };

    it('AC1 — the save is refused while the scope is unanswered', () => {
      asAdminWithScope({ geo_scope_id: null });
      component.onSaveDataStandardChanges();
      expect(component.saveChangesType).toBeNull();
      expect(component.showConfirmSaveChangesDialog()).toBe(false);
    });

    /**
     * 🛑 The opposite of AC1, and it has to hold or the fix becomes a trap.
     *
     * The scope field lives behind `@if (fields?.geographicScope)`, and the loader stores `null`
     * when the server sends no block at all. Demanding an answer there would disable the save over
     * a field the screen never shows — an admin could not even fix a title. The rule is "answer the
     * question when it is asked", not "always have a scope".
     */
    it('does NOT block a result that has no geographic scope section on screen', () => {
      asAdminWithScope(null);

      expect(component.isGeoScopeCompleted()).toBe(true);

      component.onSaveDataStandardChanges();
      expect(component.showConfirmSaveChangesDialog()).toBe(true);
    });

    it('AC1 — and the save goes through once a scope is selected', () => {
      asAdminWithScope({ geo_scope_id: 3 });
      component.onSaveDataStandardChanges();
      expect(component.saveChangesType).toBe('dataStandard');
      expect(component.showConfirmSaveChangesDialog()).toBe(true);
    });

    it('tells the reporter WHY the button is disabled', () => {
      asAdminWithScope({ geo_scope_id: null });
      expect(component.getSaveDataStandardsTooltip()).toBe('Please select the geographic focus of the result before saving');
    });

    it('stops blaming the scope once it is answered', () => {
      asAdminWithScope({ geo_scope_id: 1 });
      expect(component.getSaveDataStandardsTooltip()).not.toContain('geographic focus');
    });

    it('isGeoScopeCompleted tracks the selection', () => {
      asAdminWithScope({ geo_scope_id: null });
      expect(component.isGeoScopeCompleted()).toBe(false);

      component.resultDetail.set(buildDetail({ geographicScope: { geo_scope_id: 50 } }));
      expect(component.isGeoScopeCompleted()).toBe(true);
    });
  });

  describe('save-changes dialogs', () => {
    it('onSaveTocChanges bails when planned_result is undefined', () => {
      component.tocInitiative = { planned_result: undefined };
      component.onSaveTocChanges();
      expect(component.showConfirmSaveChangesDialog()).toBe(false);
    });

    it('onSaveTocChanges bails when tocInitiative is null', () => {
      component.tocInitiative = null;
      component.onSaveTocChanges();
      expect(component.showConfirmSaveChangesDialog()).toBe(false);
    });

    it('onSaveTocChanges opens the dialog', () => {
      component.tocInitiative = { planned_result: true };
      component.onSaveTocChanges();
      expect(component.saveChangesType).toBe('toc');
      expect(component.showConfirmSaveChangesDialog()).toBe(true);
    });

    it('onSaveDataStandardChanges opens the dialog', () => {
      // P2-3154: Data Standards are only saveable by a platform administrator.
      apiMock.rolesSE.isAdmin = true;
      // P2-3620: ...and only once the required geographic scope is answered.
      component.resultDetail.set(buildDetail({ geographicScope: { geo_scope_id: 1 } }));
      component.onSaveDataStandardChanges();
      expect(component.saveChangesType).toBe('dataStandard');
      expect(component.showConfirmSaveChangesDialog()).toBe(true);
    });

    it('cancelSaveChanges resets state', () => {
      component.onSaveDataStandardChanges();
      component.cancelSaveChanges();
      expect(component.showConfirmSaveChangesDialog()).toBe(false);
      expect(component.saveChangesType).toBeNull();
      expect(component.saveChangesJustification).toBe('');
    });

    it('confirmSaveChanges ignores a blank justification', () => {
      component.confirmSaveChanges('   ');
      expect(component.isSaving()).toBe(false);
    });

    it('confirmSaveChanges routes to the toc executor', () => {
      const spy = jest.spyOn(component as any, 'executeSaveTocChanges').mockImplementation(() => undefined);
      component.saveChangesType = 'toc';
      component.confirmSaveChanges('why');
      expect(spy).toHaveBeenCalled();
      expect(component.saveChangesJustification).toBe('why');
    });

    it('confirmSaveChanges routes to the data-standard executor', () => {
      const spy = jest.spyOn(component as any, 'executeSaveDataStandardChanges').mockImplementation(() => undefined);
      component.saveChangesType = 'dataStandard';
      component.confirmSaveChanges('why');
      expect(spy).toHaveBeenCalled();
    });

    it('confirmSaveChanges with a null type calls neither executor', () => {
      const a = jest.spyOn(component as any, 'executeSaveTocChanges').mockImplementation(() => undefined);
      const b = jest.spyOn(component as any, 'executeSaveDataStandardChanges').mockImplementation(() => undefined);
      component.saveChangesType = null;
      component.confirmSaveChanges('why');
      expect(a).not.toHaveBeenCalled();
      expect(b).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------- executeSaveTocChanges

  describe('executeSaveTocChanges', () => {
    const exec = () => (component as any).executeSaveTocChanges();

    it('bails when tocInitiative is null', () => {
      component.tocInitiative = null;
      component.isSaving.set(true);
      exec();
      expect(component.isSaving()).toBe(false);
      expect(apiMock.resultsSE.PATCH_BilateralTocMetadata).not.toHaveBeenCalled();
    });

    it('bails when planned_result is undefined', () => {
      component.tocInitiative = { planned_result: undefined };
      exec();
      expect(apiMock.resultsSE.PATCH_BilateralTocMetadata).not.toHaveBeenCalled();
    });

    it('bails when the result id is missing', () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      component.tocInitiative = { planned_result: true };
      component.resultDetail.set(null);
      exec();
      expect(apiMock.resultsSE.PATCH_BilateralTocMetadata).not.toHaveBeenCalled();
    });

    it('builds the full payload and reloads on success', fakeAsync(() => {
      const loadSpy = jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.resultDetail.set(buildDetail());
      component.initiativeIdSignal.set(77);
      component.saveChangesJustification = 'because';
      component.tocInitiative = {
        planned_result: true,
        initiative_id: 77,
        result_toc_results: [
          {
            toc_result_id: 10,
            toc_level_id: 2,
            toc_progressive_narrative: 'nar',
            result_toc_result_id: 88,
            indicators: [
              {
                toc_results_indicator_id: null,
                related_node_id: 'node-1',
                indicator_contributing: 3,
                status_id: 1,
                result_toc_result_indicator_id: 4,
                targets: [{ id: 9, number_target: 2, contributing_indicator: 1, target_date: 2025, target_progress_narrative: 'p', indicator_question: 'q' }]
              },
              { toc_results_indicator_id: 'ind-2', targets: 'not-an-array' }
            ]
          },
          { toc_result_id: null, toc_level_id: null, indicators: null }
        ]
      };

      exec();
      tick();

      const body = apiMock.resultsSE.PATCH_BilateralTocMetadata.mock.calls[0][1];
      expect(apiMock.resultsSE.PATCH_BilateralTocMetadata.mock.calls[0][0]).toBe(101);
      expect(body.tocMetadata.initiative_id).toBe(77);
      expect(body.tocMetadata.result_toc_results[0].result_toc_result_id).toBe(88);
      expect(body.tocMetadata.result_toc_results[0].indicators[0].toc_results_indicator_id).toBe('node-1');
      expect(body.tocMetadata.result_toc_results[0].indicators[0].targets[0].indicators_targets).toBe(9);
      expect(body.tocMetadata.result_toc_results[0].indicators[1].targets).toEqual([]);
      expect(body.tocMetadata.result_toc_results[1].indicators).toEqual([]);
      expect(body.updateExplanation).toBe('because');
      expect(loadSpy).toHaveBeenCalledWith('101');
      expect(component.isSaving()).toBe(false);
      expect(component.saveChangesType).toBeNull();
      flush();
    }));

    it('falls back to an empty result_toc_results list when the tab list is empty', fakeAsync(() => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.resultDetail.set(buildDetail());
      component.initiativeIdSignal.set(null);
      component.tocInitiative = { planned_result: false, initiative_id: 55, result_toc_results: null };
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralTocMetadata.mock.calls[0][1];
      expect(body.tocMetadata.result_toc_results).toEqual([]);
      expect(body.tocMetadata.initiative_id).toBe(55);
      flush();
    }));

    // @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-6, R-5.c) — falsifier: with
    // tocInitiative.initiative_id undefined, no PATCH is sent and the message is shown.
    it('blocks the save and shows a message when initiative_id is undefined — no PATCH sent, no signal fallback', () => {
      component.resultDetail.set(buildDetail());
      component.initiativeIdSignal.set(999); // must NOT be used as a fallback (R-5.c)
      component.tocInitiative = { planned_result: true, initiative_id: undefined, result_toc_results: [] };
      exec();
      expect(apiMock.resultsSE.PATCH_BilateralTocMetadata).not.toHaveBeenCalled();
      expect(component.tocInitiativeMissingMessage()).toBeTruthy();
      expect(component.isSaving()).toBe(false);
      expect(component.showConfirmSaveChangesDialog()).toBe(false);
    });

    it('blocks the save and shows a message when initiative_id is null', () => {
      component.resultDetail.set(buildDetail());
      component.tocInitiative = { planned_result: false, initiative_id: null, result_toc_results: [] };
      exec();
      expect(apiMock.resultsSE.PATCH_BilateralTocMetadata).not.toHaveBeenCalled();
      expect(component.tocInitiativeMissingMessage()).toBeTruthy();
    });

    // @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-6, R-8 defence in depth) —
    // falsifier: the save body on P25 No has an empty list.
    it('sends an empty result_toc_results list on a P25-onward No, even if stale tab data exists', fakeAsync(() => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2025 } }));
      component.tocInitiative = {
        planned_result: false,
        initiative_id: 42,
        result_toc_results: [{ toc_result_id: 9, toc_level_id: 3, indicators: [] }]
      };
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralTocMetadata.mock.calls[0][1];
      expect(body.tocMetadata.result_toc_results).toEqual([]);
      expect(body.tocMetadata.initiative_id).toBe(42);
      flush();
    }));

    it('does NOT force an empty result_toc_results list on a pre-P25 No', fakeAsync(() => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', portfolio_start_year: 2022 } }));
      component.tocInitiative = {
        planned_result: false,
        initiative_id: 42,
        result_toc_results: [{ toc_result_id: 9, toc_level_id: 3, indicators: [] }]
      };
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralTocMetadata.mock.calls[0][1];
      expect(body.tocMetadata.result_toc_results.length).toBe(1);
      flush();
    }));

    it('handles the error branch', fakeAsync(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      apiMock.resultsSE.PATCH_BilateralTocMetadata.mockReturnValue(throwError(() => new Error('nope')));
      component.resultDetail.set(buildDetail());
      component.tocInitiative = { planned_result: true, result_toc_results: [] };
      component.isSaving.set(true);
      exec();
      tick();
      expect(component.isSaving()).toBe(false);
      expect(component.showConfirmSaveChangesDialog()).toBe(false);
      flush();
    }));
  });

  // ----------------------------------------- buildImplementingOrgsFromSelection

  describe('buildImplementingOrgsFromSelection', () => {
    const build = (list: any[]) => (component as any).buildImplementingOrgsFromSelection(list);

    it('returns [] for an empty selection', () => {
      expect(build([])).toEqual([]);
      expect(build(null)).toEqual([]);
    });

    it('resolves ids from numbers, numeric strings and objects', () => {
      const result = build([7, '7', { institutions_id: 7 }, { institution_id: 7 }, { id: 7 }]);
      expect(result.length).toBe(5);
      expect(result[0]).toEqual({ institution_id: 7, acronym: 'ACR', institution_name: 'Inst 7' });
    });

    it('drops unresolvable entries', () => {
      expect(build(['', null, true, { nothing: 1 }])).toEqual([]);
    });

    it('uses the inline object when it already carries names', () => {
      const result = build([{ id: 99, acronym: 'IN', institutions_name: 'Inline' }]);
      expect(result).toEqual([{ institution_id: 99, acronym: 'IN', institution_name: 'Inline' }]);
    });

    it('returns nulls for names when the institution is unknown', () => {
      const result = build([1234]);
      expect(result).toEqual([{ institution_id: 1234, acronym: null, institution_name: null }]);
    });

    it('survives a missing institutions list', () => {
      institutionsMock.institutionsList = null;
      expect(build([7])).toEqual([{ institution_id: 7, acronym: null, institution_name: null }]);
    });
  });

  // ---------------------------------------------- executeSaveDataStandardChanges

  describe('executeSaveDataStandardChanges', () => {
    const exec = () => (component as any).executeSaveDataStandardChanges();

    beforeEach(() => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
    });

    it('bails without a result id', () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      component.resultDetail.set(null);
      exec();
      expect(apiMock.resultsSE.PATCH_BilateralDataStandard).not.toHaveBeenCalled();
    });

    it('sends a minimal payload with empty collections', fakeAsync(() => {
      component.resultDetail.set(buildDetail({ contributingCenters: null, contributingProjects: null, contributingInitiatives: null }));
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.commonFields.id).toBe(101);
      expect(body.geographicScope).toBeUndefined();
      expect(body.contributingCenters).toEqual([]);
      expect(body.contributingInitiatives).toBeUndefined();
      flush();
    }));

    it('maps the geographic scope including sub-nationals', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({
          geographicScope: {
            has_countries: true,
            regions: [{ region_id: 3 }],
            countries: [
              { country_id: 1, sub_national: [{ id: 2, code: 'c', name: 'n', country_id: 1, other_names: null, language_iso_2: 'en', country_iso_alpha_2: 'CO', romanization_system_name: null, subnational_category_name: null, is_active: true }] },
              { id: 5, sub_national: null }
            ],
            extra_regions: [{ id: 8 }],
            extra_countries: [{ id: 9, sub_national: [] }]
          }
        })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.geographicScope.regions).toEqual([{ id: 3 }]);
      expect(body.geographicScope.countries[0].sub_national[0].local_name).toBe('');
      expect(body.geographicScope.countries[1].sub_national).toEqual([]);
      expect(body.geographicScope.has_regions).toBe(false);
      expect(body.geographicScope.extra_regions).toEqual([{ id: 8 }]);
      expect(body.geographicScope.has_extra_geo_scope).toBeNull();
      flush();
    }));

    it.each([false, true])('preserves the saved extra answer %s and children', fakeAsync(answer => {
      component.resultDetail.set(buildDetail({ geographicScope: {
        geo_scope_id: 1, has_extra_geo_scope: answer, extra_geo_scope_id: 2,
        extra_regions: [{ id: 8 }], extra_countries: [{ id: 9, sub_national: [{ id: 4 }] }],
        has_extra_regions: true, has_extra_countries: true
      } }));
      exec();
      tick();
      const geo = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1].geographicScope;
      expect(geo).toEqual(expect.objectContaining({ has_extra_geo_scope: answer, extra_geo_scope_id: 2, extra_regions: [{ id: 8 }], has_extra_regions: true, has_extra_countries: true }));
      expect(geo.extra_countries[0].sub_national[0].id).toBe(4);
      flush();
    }));

    it('handles an empty geographic scope object shape', fakeAsync(() => {
      component.resultDetail.set(buildDetail({ geographicScope: { has_countries: true } }));
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.geographicScope.regions).toEqual([]);
      expect(body.geographicScope.countries).toEqual([]);
      expect(body.geographicScope.geo_scope_id).toBeNull();
      flush();
    }));

    it('maps centers using the centers catalogue and drops unknown ones', fakeAsync(() => {
      centersMock.centersList = [{ code: 'AAA', name: 'Alpha' }];
      component.resultDetail.set(buildDetail({ contributingCenters: ['AAA', { code: 'ZZZ' }, { nope: 1 }] }));
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.contributingCenters.length).toBe(1);
      expect(body.contributingCenters[0].is_leading_result).toBe(1);
      flush();
    }));

    it('splits contributing initiatives into accepted and pending', fakeAsync(() => {
      component.originalAcceptedContributingInitiatives = [
        { id: 10, share_result_request_id: 55, is_active: undefined, initiative_id: 1 },
        { id: 20, share_result_request_id: null, initiative_id: 2 }
      ];
      component.resultDetail.set(buildDetail({ contributingInitiatives: [1, '2', { id: '3' }, { id: 4 }, 'zzz'] }));
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.contributingInitiatives.accepted_contributing_initiatives).toEqual([{ id: 10, share_result_request_id: 55, is_active: true }]);
      expect(body.contributingInitiatives.pending_contributing_initiatives).toEqual([{ id: 2 }, { id: 3 }, { id: 4 }]);
      flush();
    }));

    it('matches accepted initiatives by id when initiative_id is absent', fakeAsync(() => {
      component.originalAcceptedContributingInitiatives = [{ id: 5, share_result_request_id: 9, is_active: 0 }];
      component.resultDetail.set(buildDetail({ contributingInitiatives: [5] }));
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.contributingInitiatives.accepted_contributing_initiatives[0].is_active).toBe(false);
      flush();
    }));

    it('treats a non-array contributingInitiatives value as an empty selection', fakeAsync(() => {
      component.resultDetail.set(buildDetail({ contributingInitiatives: { accepted_contributing_initiatives: [] } }));
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.contributingInitiatives.pending_contributing_initiatives).toEqual([]);
      flush();
    }));

    it('maps projects from objects and primitives', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({ contributingProjects: ['p1', { project_id: 'p2' }, { id: 'p3' }, { obj_clarisa_project: { id: 'p4' } }, null, {}] })
      );
      exec();
      tick();
      expect(apiMock.resultsSE.PATCH_BilateralDataStandard).toHaveBeenCalled();
      flush();
    }));

    it('maps institutions preserving original record ids', fakeAsync(() => {
      component.originalContributingInstitutions = [{ id: '900', institutions_id: 3 }] as any;
      component.resultDetail.set(
        buildDetail({
          contributingInstitutions: [
            { id: 1, institutions_id: 2, institution_roles_id: '4', is_active: 0 },
            3,
            { institution_id: 8 },
            { institutions_id: 9, institution_roles_id: 6 }
          ]
        })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.contributingInstitutions[0]).toEqual({ id: 1, institutions_id: 2, institution_roles_id: 4, is_active: 0, result_id: 101 });
      expect(body.contributingInstitutions[1]).toEqual({ id: 900, institutions_id: 3, institution_roles_id: 2, is_active: 1, result_id: 101 });
      expect(body.contributingInstitutions[2].id).toBeNull();
      expect(body.contributingInstitutions[3].institution_roles_id).toBe(6);
      flush();
    }));

    it('maps evidence entries', fakeAsync(() => {
      component.resultDetail.set(buildDetail({ evidence: [{ id: 1, link: 'a', is_sharepoint: 1 }, { evidence_link: 'b' }, {}] }));
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.evidence).toEqual([
        { id: 1, link: 'a', is_sharepoint: 1 },
        { id: null, link: 'b', is_sharepoint: 0 },
        { id: null, link: '', is_sharepoint: 0 }
      ]);
      flush();
    }));

    it('builds the innovation-use payload (type 2)', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({
          commonFields: { id: '101', result_type_id: 2, result_description: null },
          resultTypeResponse: [
            {
              actors: [{ a: 1 }],
              organizations: null,
              measures: [{ m: 1 }],
              investment_partners: 'x',
              investment_projects: [{ non_pooled_project_budget_id: 3, project_id: '1', kind_cash: 2, is_determined: true, name: 'n' }]
            }
          ]
        })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.resultTypeResponse[0].organizations).toEqual([]);
      expect(body.resultTypeResponse[0].investment_partners).toEqual([]);
      expect(body.resultTypeResponse[0].investment_projects[0].non_pooled_projetct_budget_id).toBe(3);
      flush();
    }));

    it('builds the innovation-use payload cloning every populated sub-list', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({
          commonFields: { id: '101', result_type_id: 2 },
          resultTypeResponse: [
            {
              actors: [{ a: 1 }],
              organizations: [{ o: 1 }],
              measures: [{ m: 1 }],
              investment_partners: [{ p: 1 }],
              investment_projects: null
            }
          ]
        })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.resultTypeResponse[0].organizations).toEqual([{ o: 1 }]);
      expect(body.resultTypeResponse[0].investment_partners).toEqual([{ p: 1 }]);
      expect(body.resultTypeResponse[0].investment_projects).toEqual([]);
      flush();
    }));

    it('builds the policy-change payload (type 1)', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({
          commonFields: { id: '101', result_type_id: 1, result_description: 'd' },
          resultTypeResponse: [{ policy_type_id: 3, institutions: [7] }]
        })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.resultTypeResponse.policy_type_id).toBe(3);
      expect(body.resultTypeResponse.result_policy_change_id).toBeNull();
      expect(body.resultTypeResponse.implementing_organization[0].institution_id).toBe(7);
      flush();
    }));

    it('builds the policy-change payload with no institutions array', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({
          commonFields: { id: '101', result_type_id: 1 },
          resultTypeResponse: [{ policy_type_id: 3, policy_stage_id: 4, policy_stage_name: 'a', policy_type_name: 'b', result_policy_change_id: 6 }]
        })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.resultTypeResponse.implementing_organization).toEqual([]);
      expect(body.resultTypeResponse.result_policy_change_id).toBe(6);
      flush();
    }));

    it('builds the capacity-development payload (type 5)', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({
          commonFields: { id: '101', result_type_id: 5 },
          resultTypeResponse: [{ male_using: '3', female_using: 0, non_binary_using: null, has_unkown_using: 4 }]
        })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.resultTypeResponse.male_using).toBe(3);
      expect(body.resultTypeResponse.female_using).toBeNull();
      expect(body.resultTypeResponse.has_unkown_using).toBe(4);
      flush();
    }));

    it('builds the capacity-development payload with undefined unknowns', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({ commonFields: { id: '101', result_type_id: 5 }, resultTypeResponse: [{ capdev_term_id: 2, capdev_delivery_method_id: 1 }] })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.resultTypeResponse.has_unkown_using).toBeNull();
      expect(body.resultTypeResponse.capdev_term_id).toBe(2);
      flush();
    }));

    it('builds the knowledge-product payload (type 6)', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({ commonFields: { id: '101', result_type_id: 6 }, resultTypeResponse: [{ licence: 'CC', metadata: null, keywords: [{ k: 1 }] }] })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.resultTypeResponse.licence).toBe('CC');
      expect(body.resultTypeResponse.metadata).toEqual([]);
      expect(body.resultTypeResponse.keywords).toEqual([{ k: 1 }]);
      flush();
    }));

    it('builds the innovation-development payload (type 7)', fakeAsync(() => {
      component.resultDetail.set(
        buildDetail({
          commonFields: { id: '101', result_type_id: 7 },
          resultTypeResponse: [{ innovation_readiness_level_id: 4, readinness_level_id: null, level: 'L', name: 'N' }]
        })
      );
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.resultTypeResponse.readinness_level_id).toBe(4);
      expect(body.resultTypeResponse.level).toBe('L');
      flush();
    }));

    it('ignores unknown result types', fakeAsync(() => {
      component.resultDetail.set(buildDetail({ commonFields: { id: '101', result_type_id: 99 }, resultTypeResponse: [{ any: 1 }] }));
      exec();
      tick();
      const body = apiMock.resultsSE.PATCH_BilateralDataStandard.mock.calls[0][1];
      expect(body.resultTypeResponse).toBeUndefined();
      flush();
    }));

    it('handles the error branch', fakeAsync(() => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      apiMock.resultsSE.PATCH_BilateralDataStandard.mockReturnValue(throwError(() => new Error('nope')));
      component.resultDetail.set(buildDetail());
      component.isSaving.set(true);
      exec();
      tick();
      expect(component.isSaving()).toBe(false);
      flush();
    }));
  });

  // ----------------------------------------------------- ensureInstitutionsLoaded

  describe('ensureInstitutionsLoaded', () => {
    it('resolves immediately when institutions are already loaded', async () => {
      await expect((component as any).ensureInstitutionsLoaded()).resolves.toBeUndefined();
    });

    it('resolves when loadedInstitutions emits', fakeAsync(() => {
      institutionsMock.institutionsList = [];
      let done = false;
      (component as any).ensureInstitutionsLoaded().then(() => (done = true));
      loadedInstitutions$.next(true);
      tick();
      expect(done).toBe(true);
      tick(3000);
    }));

    it('resolves through the polling interval', fakeAsync(() => {
      institutionsMock.institutionsList = [];
      let done = false;
      (component as any).ensureInstitutionsLoaded().then(() => (done = true));
      institutionsMock.institutionsList = [{ institutions_id: 1 }];
      tick(100);
      tick();
      expect(done).toBe(true);
      tick(3000);
    }));

    it('resolves through the 3s timeout fallback', fakeAsync(() => {
      institutionsMock.institutionsList = [];
      let done = false;
      (component as any).ensureInstitutionsLoaded().then(() => (done = true));
      tick(3000);
      tick();
      expect(done).toBe(true);
    }));
  });

  // -------------------------------------------------------- loadContributingLists

  describe('loadContributingLists', () => {
    it('stores projects and stringifies ids', () => {
      apiMock.resultsSE.GET_ClarisaProjects.mockReturnValue(of({ response: [{ id: 5 }, { id: null }] }));
      (component as any).loadContributingLists();
      expect(component.clarisaProjectsList()[0].project_id).toBe('5');
      expect(component.clarisaProjectsList()[1].project_id).toBeNull();
    });

    it('handles a null response', () => {
      apiMock.resultsSE.GET_ClarisaProjects.mockReturnValue(of({ response: null }));
      (component as any).loadContributingLists();
      expect(component.clarisaProjectsList()).toEqual([]);
    });

    it('handles the error branch', () => {
      apiMock.resultsSE.GET_ClarisaProjects.mockReturnValue(throwError(() => new Error('x')));
      component.clarisaProjectsList.set([{ id: 1 }]);
      (component as any).loadContributingLists();
      expect(component.clarisaProjectsList()).toEqual([]);
    });
  });

  // ------------------------------------------------- fetchAndProcessResultDetail

  describe('fetchAndProcessResultDetail', () => {
    const fetch = (id = '101') => (component as any).fetchAndProcessResultDetail(id);

    it('handles the error branch', () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(throwError(() => new Error('boom')));
      component.isLoading.set(true);
      fetch();
      expect(component.isLoading()).toBe(false);
      expect(component.isLoadingInformation()).toBe(false);
    });

    it('processes an empty-ish detail and falls back to the default toc shape', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(of({ response: buildDetail({ commonFields: null }) }));
      fetch();
      tick(400);
      expect(component.resultDetail()).toBeTruthy();
      expect(component.tocInitiative.planned_result).toBe(false);
      expect(component.tocConsumed()).toBe(true);
      expect(component.isLoadingInformation()).toBe(false);
      flush();
    }));

    it('sets the current result data when commonFields exist', fakeAsync(() => {
      fetch();
      tick(400);
      expect(apiMock.resultsSE.currentResultId).toBe(101);
      expect(apiMock.dataControlSE.currentResult.portfolio).toBe('P25');
      expect(apiMock.dataControlSE.currentResultSignal.set).toHaveBeenCalled();
      flush();
    }));

    // @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-6) — falsifier: opening a result
    // with planned_result = null issues zero PATCH calls. Merely loading/normalizing the ToC
    // answer (R-11 treats it as No) must never write anything.
    it('FALSIFIER — opening a result with planned_result null makes zero PATCH calls', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({ response: buildDetail({ tocMetadata: { planned_result: null, initiative_id: null, result_toc_results: [] } }) })
      );
      fetch();
      tick(400);
      expect(component.tocInitiative.planned_result).toBe(false); // R-11: unanswered renders as No
      expect(apiMock.resultsSE.PATCH_BilateralTocMetadata).not.toHaveBeenCalled();
      expect(apiMock.resultsSE.PATCH_BilateralDataStandard).not.toHaveBeenCalled();
      expect(apiMock.resultsSE.PATCH_BilateralReviewDecision).not.toHaveBeenCalled();
      flush();
    }));

    it('stores the initiative list for the picker only — does NOT set initiativeIdSignal from it (R-5.c)', fakeAsync(() => {
      apiMock.resultsSE.GET_AllWithoutResults.mockReturnValue(of({ response: [{ id: 12, official_code: 'SP12' }] }));
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(of({ response: buildDetail({ tocMetadata: null }) }));
      fetch();
      tick(400);
      expect(component.contributingInitiativesList().length).toBe(1);
      // @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-6, R-5.c): no fallback to the
      // first program of the global initiatives list — the drawer had no tocMetadata, so it must
      // NOT guess `initiativeIdSignal` from GET_AllWithoutResults's response[0].id.
      expect(component.initiativeIdSignal()).toBeNull();
      flush();
    }));

    it('handles a null initiative response', fakeAsync(() => {
      apiMock.resultsSE.GET_AllWithoutResults.mockReturnValue(of({ response: null }));
      fetch();
      tick(400);
      expect(component.contributingInitiativesList()).toEqual([]);
      flush();
    }));

    it('handles the initiative list error branch', fakeAsync(() => {
      apiMock.resultsSE.GET_AllWithoutResults.mockReturnValue(throwError(() => new Error('x')));
      component.contributingInitiativesList.set([{ id: 1 }]);
      fetch();
      tick(400);
      expect(component.contributingInitiativesList()).toEqual([]);
      flush();
    }));

    it('uses the active portfolio from dataControl when present', fakeAsync(() => {
      apiMock.dataControlSE.currentResult = { portfolio: 'P22' };
      fetch();
      tick(400);
      expect(apiMock.resultsSE.GET_AllWithoutResults).toHaveBeenCalled();
      flush();
    }));

    it('maps centers, lead projects, institutions and result-type responses', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({
          response: buildDetail({
            contributingCenters: [{ code: 'AAA' }],
            contributingProjects: [
              { is_lead: true, project_id: 'p1' },
              { obj_clarisa_project: { id: 'p2' } },
              { id: 'p3' },
              { is_lead: true, obj_clarisa_project: { id: 'p4' } }
            ],
            contributingInstitutions: [{ id: 1, institutions_id: 2, institution_roles_id: '4' }, { institution_id: 3 }, { institutions_id: 'abc' }, {}],
            resultTypeResponse: [
              { actors: null, investment_projects: [] },
              { implementing_organization: [{ institution_id: 5 }, { institutions_id: 6 }, { id: 7 }, {}] },
              { somethingElse: true },
              { institutions: [1] }
            ]
          })
        })
      );
      fetch();
      tick(400);
      const detail: any = component.resultDetail();
      expect(detail.contributingCenters).toEqual(['AAA']);
      expect(component.leadProjectIds()).toEqual(['p1', 'p4']);
      expect(detail.contributingProjects).toEqual(['p1', 'p2', 'p3', 'p4']);
      expect(detail.contributingInstitutions).toEqual([2, 3]);
      expect(component.originalContributingInstitutions?.length).toBe(4);
      expect(detail.resultTypeResponse[0].organizations).toEqual([]);
      expect(detail.resultTypeResponse[1].institutions).toEqual([5, 6, 7]);
      expect(detail.resultTypeResponse[2].institutions).toEqual([]);
      flush();
    }));

    it('defaults missing collections to empty arrays', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({
          response: buildDetail({
            contributingCenters: null,
            contributingProjects: null,
            contributingInstitutions: null,
            contributingInitiatives: null
          })
        })
      );
      fetch();
      tick(400);
      const detail: any = component.resultDetail();
      expect(detail.contributingCenters).toEqual([]);
      expect(detail.contributingProjects).toEqual([]);
      expect(detail.contributingInstitutions).toEqual([]);
      expect(detail.contributingInitiatives).toEqual([]);
      expect(component.leadProjectIds()).toEqual([]);
      flush();
    }));

    it('maps an array of contributing initiatives', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({ response: buildDetail({ contributingInitiatives: [{ id: 3 }, { official_code: 'SP02' }, 9] }) })
      );
      fetch();
      tick(400);
      expect((component.resultDetail() as any).contributingInitiatives).toEqual([3, 'SP02', 9]);
      expect(component.disabledContributingInitiatives()).toEqual([]);
      flush();
    }));

    it('splits an object-shaped contributing initiatives payload', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({
          response: buildDetail({
            contributingInitiatives: {
              contributing_and_primary_initiative: [{ id: 1, initiative_role_id: 1 }, { id: 2, initiative_role_id: '1' }, { id: 3, initiative_role_id: 2 }],
              accepted_contributing_initiatives: [{ id: '10', share_result_request_id: 5, is_active: 1 }, { id: 'bad' }],
              pending_contributing_initiatives: [{ id: 11 }, { official_code: 'SP03' }]
            }
          })
        })
      );
      fetch();
      tick(400);
      expect(component.disabledContributingInitiatives().length).toBe(2);
      expect(component.contributingInitiativesStatusMap().get(10)).toBe('accepted');
      expect(component.contributingInitiativesStatusMap().get(11)).toBe('pending');
      expect(component.originalAcceptedContributingInitiatives[0].initiative_id).toBe('10');
      expect((component.resultDetail() as any).contributingInitiatives).toEqual([10, NaN, 11, 'SP03']);
      flush();
    }));

    it('handles a missing contributing_and_primary_initiative key', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({ response: buildDetail({ contributingInitiatives: { accepted_contributing_initiatives: null, pending_contributing_initiatives: null } }) })
      );
      fetch();
      tick(400);
      expect((component.resultDetail() as any).contributingInitiatives).toEqual([]);
      flush();
    }));

    it('handles a primitive contributing initiatives value', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(of({ response: buildDetail({ contributingInitiatives: 'weird' }) }));
      fetch();
      tick(400);
      expect((component.resultDetail() as any).contributingInitiatives).toEqual([]);
      flush();
    }));

    it('hydrates tocMetadata delivered as an array with tabs', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({
          response: buildDetail({
            tocMetadata: [
              {
                planned_result: true,
                initiative_id: 42,
                official_code: 'SP42',
                short_name: 'Short',
                toc_progressive_narrative: null,
                result_toc_results: [
                  { toc_level_id: 1, toc_result_id: 2, toc_progressive_narrative: 'from tab', indicators: null },
                  { uniqueId: 'x', toc_level_id: 3, toc_result_id: 4, indicators: [{ related_node_id: 1 }] },
                  null
                ]
              }
            ]
          })
        })
      );
      fetch();
      tick(400);
      expect(component.tocInitiative.planned_result).toBe(true);
      expect(component.tocInitiative.initiative_id).toBe(42);
      expect(component.tocInitiative.toc_progressive_narrative).toBe('from tab');
      expect(component.tocInitiative.result_toc_results[0].indicators[0].targets.length).toBe(1);
      expect(component.tocInitiative.result_toc_results[1].indicators[0].targets.length).toBe(1);
      expect(component.initiativeIdSignal()).toBe(42);
      expect(component.isTocDirty()).toBe(false);
      flush();
    }));

    it('treats a null planned_result as false and injects a default tab', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({ response: buildDetail({ tocMetadata: { planned_result: null, result_toc_results: 'not-array' } }) })
      );
      fetch();
      tick(400);
      expect(component.tocInitiative.planned_result).toBe(false);
      expect(component.tocInitiative.result_toc_results.length).toBe(1);
      expect(component.tocInitiative.result_toc_results[0].uniqueId).toBe('0');
      flush();
    }));

    it('falls back to defaults when tocMetadata is an empty array — no initiative_id guess (R-5.c)', fakeAsync(() => {
      apiMock.resultsSE.GET_AllWithoutResults.mockReturnValue(of({ response: [{ id: 33 }] }));
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(of({ response: buildDetail({ tocMetadata: [] }) }));
      fetch();
      tick(400);
      expect(component.tocInitiative.planned_result).toBe(false);
      // @akili-spec bilateral/review-toc-only-editing (BIL-RTE-T-6, R-5.c): no tocMetadata means
      // the drawer cannot tell which program this belongs to — it must NOT fall back to the first
      // program of the global initiatives list (`response[0].id`, here 33).
      expect(component.tocInitiative.initiative_id).toBeNull();
      flush();
    }));

    it('clones an object-shaped resultTypeResponse and re-derives institutions after the delayed pass', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({
          response: buildDetail({
            contributingCenters: [{ code: 'C1' }],
            contributingProjects: [{ project_id: 'p1' }],
            contributingInstitutions: [{ institutions_id: 4 }],
            resultTypeResponse: { implementing_organization: [{ institution_id: 1 }] }
          })
        })
      );
      fetch();
      tick(400);
      const detail: any = component.resultDetail();
      expect(Array.isArray(detail.resultTypeResponse)).toBe(false);
      expect(detail.contributingCenters).toEqual(['C1']);
      flush();
    }));

    it('derives institutions in the delayed pass when the first pass skipped them', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({
          response: buildDetail({
            resultTypeResponse: [{ actors: [], implementing_organization: [{ institution_id: 3 }, { institutions_id: 4 }, {}] }]
          })
        })
      );
      fetch();
      tick(400);
      const detail: any = component.resultDetail();
      expect(detail.resultTypeResponse[0].institutions).toEqual([3, 4]);
      flush();
    }));

    it('re-derives institutions in the delayed pass for array responses', fakeAsync(() => {
      apiMock.resultsSE.GET_BilateralResultDetail.mockReturnValue(
        of({
          response: buildDetail({
            resultTypeResponse: [{ implementing_organization: [{ institution_id: 1 }, {}], institutions: [] }]
          })
        })
      );
      fetch();
      tick(400);
      const detail: any = component.resultDetail();
      expect(detail.resultTypeResponse[0].institutions).toEqual([1]);
      flush();
    }));
  });

  // --------------------------------------------------------------- loadResultDetail

  it('loadResultDetail chains the lists and the fetch', fakeAsync(() => {
    const fetchSpy = jest.spyOn(component as any, 'fetchAndProcessResultDetail').mockImplementation(() => undefined);
    (component as any).loadResultDetail('55');
    tick(10);
    expect(fetchSpy).toHaveBeenCalledWith('55');
    expect(component.isLoading()).toBe(true);
    flush();
  }));

  // -------------------------------------------------------------------- drawer UI

  describe('drawer chrome', () => {
    it('toggleFullScreen flips the flag', () => {
      component.toggleFullScreen();
      expect(component.drawerFullScreen()).toBe(true);
      component.toggleFullScreen();
      expect(component.drawerFullScreen()).toBe(false);
    });

    it('closeDrawer resets everything', () => {
      component.visible.set(true);
      component.drawerFullScreen.set(true);
      component.resultDetail.set(buildDetail());
      component.rejectJustification = 'x';
      component.leadProjectIds.set(['1']);
      component.showConfirmApproveDialog.set(true);

      component.closeDrawer();

      expect(component.visible()).toBe(false);
      expect(component.drawerFullScreen()).toBe(false);
      expect(component.resultDetail()).toBeNull();
      expect(component.rejectJustification).toBe('');
      expect(component.leadProjectIds()).toEqual([]);
      expect(component.showConfirmApproveDialog()).toBe(false);
      expect(component.tocInitiative.planned_result).toBeNull();
    });

    it('navigateToResultCenter closes and navigates', () => {
      component.navigateToResultCenter();
      expect(routerMock.navigate).toHaveBeenCalledWith(['/result/results-outlet/results-list']);
    });
  });

  // ------------------------------------------------- onContributingProjectsChange

  describe('onContributingProjectsChange', () => {
    it('does nothing without a detail', () => {
      expect(() => component.onContributingProjectsChange([])).not.toThrow();
    });

    it('does nothing when resultTypeResponse is not a non-empty array', () => {
      component.resultDetail.set(buildDetail({ resultTypeResponse: [] }));
      component.onContributingProjectsChange([]);
      expect((component.resultDetail() as any).resultTypeResponse).toEqual([]);
    });

    it('does nothing when the result type has no investment_projects key', () => {
      component.resultDetail.set(buildDetail({ resultTypeResponse: [{ other: 1 }] }));
      component.onContributingProjectsChange([{ project_id: '1' }]);
      expect((component.resultDetail() as any).resultTypeResponse[0].investment_projects).toBeUndefined();
    });

    it('syncs the selection reusing existing rows and catalogue names', () => {
      component.clarisaProjectsList.set([{ project_id: '1', fullName: 'Full 1' }, { id: '2', shortName: 'Short 2' }]);
      component.resultDetail.set(
        buildDetail({
          resultTypeResponse: [
            { investment_projects: [{ project_id: '1', non_pooled_projetct_budget_id: 9, kind_cash: 5, is_determined: true }, { non_pooled_projetct_budget_id: 8 }, {}] }
          ]
        })
      );
      component.onContributingProjectsChange([{ project_id: '1' }, { id: '2' }, '3', {}]);
      const projects = (component.resultDetail() as any).resultTypeResponse[0].investment_projects;
      expect(projects.length).toBe(3);
      expect(projects[0]).toEqual({ non_pooled_projetct_budget_id: 9, project_id: '1', kind_cash: 5, is_determined: true, name: 'Full 1' });
      expect(projects[1].name).toBe('Short 2');
      expect(projects[2]).toEqual({ non_pooled_projetct_budget_id: undefined, project_id: '3', kind_cash: null, is_determined: null, name: '3' });
    });

    it('accepts a null selection and a non-array investment_projects value', () => {
      component.resultDetail.set(buildDetail({ resultTypeResponse: [{ investment_projects: 'nope' }] }));
      component.onContributingProjectsChange(null as any);
      expect((component.resultDetail() as any).resultTypeResponse[0].investment_projects).toEqual([]);
    });
  });

  // ------------------------------------------------------------ approve / reject

  describe('approve flow', () => {
    it('onApprove opens the dialog', () => {
      component.onApprove();
      expect(component.showConfirmApproveDialog()).toBe(true);
    });

    it('confirmApprove bails without a result', () => {
      component.confirmApprove();
      expect(apiMock.resultsSE.PATCH_BilateralReviewDecision).not.toHaveBeenCalled();
    });

    it('confirmApprove emits and closes on success', () => {
      const emitSpy = jest.spyOn(component.decisionMade, 'emit');
      component.resultToReview.set({ id: '5' } as any);
      component.confirmApprove();
      expect(apiMock.resultsSE.PATCH_BilateralReviewDecision).toHaveBeenCalledWith('5', { decision: 'APPROVE' });
      expect(emitSpy).toHaveBeenCalled();
      expect(component.visible()).toBe(false);
      expect(component.isSaving()).toBe(false);
    });

    // P2-3157 / UX Finding 5.3.5: the approval comment is the reviewer's and is optional.
    // It used to be the hardcoded literal 'Approved', which polluted the review history the
    // centre now reads back — so an empty comment must send no `justification` key at all,
    // not an empty string.
    describe('approval comment (P2-3157)', () => {
      beforeEach(() => {
        component.resultToReview.set({ id: '5' } as any);
      });

      it('omits justification entirely when the reviewer left no comment', () => {
        component.approveComment = '   ';
        component.confirmApprove();

        const [, body] = apiMock.resultsSE.PATCH_BilateralReviewDecision.mock.calls.at(-1);
        expect(body).toEqual({ decision: 'APPROVE' });
        expect('justification' in body).toBe(false);
      });

      it('sends the reviewer comment, trimmed, when there is one', () => {
        component.approveComment = '  Looks good, evidence checked.  ';
        component.confirmApprove();

        expect(apiMock.resultsSE.PATCH_BilateralReviewDecision).toHaveBeenCalledWith('5', {
          decision: 'APPROVE',
          justification: 'Looks good, evidence checked.'
        });
      });

      it('never sends the old hardcoded literal', () => {
        component.approveComment = '';
        component.confirmApprove();

        const [, body] = apiMock.resultsSE.PATCH_BilateralReviewDecision.mock.calls.at(-1);
        expect(body.justification).toBeUndefined();
      });

      it('clears the comment on success so it cannot leak into the next review', () => {
        component.approveComment = 'One-off note';
        component.confirmApprove();
        expect(component.approveComment).toBe('');
      });

      it('clears the comment when the dialog is cancelled', () => {
        component.approveComment = 'Typed then dismissed';
        component.cancelApprove();
        expect(component.approveComment).toBe('');
        expect(component.showConfirmApproveDialog()).toBe(false);
      });
    });

    it('confirmApprove handles the error branch', () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      apiMock.resultsSE.PATCH_BilateralReviewDecision.mockReturnValue(throwError(() => new Error('x')));
      component.resultToReview.set({ id: '5' } as any);
      component.confirmApprove();
      expect(component.isSaving()).toBe(false);
    });

    it('cancelApprove closes the dialog', () => {
      component.showConfirmApproveDialog.set(true);
      component.cancelApprove();
      expect(component.showConfirmApproveDialog()).toBe(false);
    });
  });

  describe('reject flow', () => {
    it('onReject opens the dialog', () => {
      component.onReject();
      expect(component.showConfirmRejectDialog()).toBe(true);
    });

    it('confirmReject bails on a blank justification', () => {
      component.rejectJustification = '  ';
      component.confirmReject();
      expect(apiMock.resultsSE.PATCH_BilateralReviewDecision).not.toHaveBeenCalled();
    });

    it('confirmReject bails without a result', () => {
      component.rejectJustification = 'because';
      component.confirmReject();
      expect(apiMock.resultsSE.PATCH_BilateralReviewDecision).not.toHaveBeenCalled();
    });

    it('confirmReject emits and closes on success', () => {
      const emitSpy = jest.spyOn(component.decisionMade, 'emit');
      component.rejectJustification = 'because';
      component.resultToReview.set({ id: '9' } as any);
      component.confirmReject();
      expect(apiMock.resultsSE.PATCH_BilateralReviewDecision).toHaveBeenCalledWith('9', { decision: 'REJECT', justification: 'because' });
      expect(emitSpy).toHaveBeenCalled();
      expect(component.showConfirmRejectDialog()).toBe(false);
    });

    it('confirmReject handles the error branch', () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      apiMock.resultsSE.PATCH_BilateralReviewDecision.mockReturnValue(throwError(() => new Error('x')));
      component.rejectJustification = 'because';
      component.resultToReview.set({ id: '9' } as any);
      component.confirmReject();
      expect(component.isSaving()).toBe(false);
    });

    it('cancelReject clears the justification', () => {
      component.rejectJustification = 'x';
      component.showConfirmRejectDialog.set(true);
      component.cancelReject();
      expect(component.showConfirmRejectDialog()).toBe(false);
      expect(component.rejectJustification).toBe('');
    });
  });

  // ------------------------------------------------------------------- evidence

  describe('evidence links', () => {
    it('addEvidenceLink ignores blank input', () => {
      component.evidenceLinkInput = '   ';
      component.resultDetail.set(buildDetail());
      component.addEvidenceLink();
      expect((component.resultDetail() as any).evidence.length).toBe(0);
    });

    it('addEvidenceLink ignores a missing input', () => {
      component.evidenceLinkInput = undefined as any;
      expect(() => component.addEvidenceLink()).not.toThrow();
    });

    it('addEvidenceLink bails without a detail', () => {
      component.evidenceLinkInput = 'http://x';
      component.addEvidenceLink();
      expect(component.evidenceLinkInput).toBe('http://x');
    });

    it('addEvidenceLink creates the evidence array when missing', () => {
      component.resultDetail.set(buildDetail({ evidence: null }));
      component.evidenceLinkInput = ' http://x ';
      component.addEvidenceLink();
      expect((component.resultDetail() as any).evidence).toEqual([{ link: 'http://x' }]);
      expect(component.evidenceLinkInput).toBe('');
    });

    it('removeEvidenceLink bails without a detail or evidence', () => {
      expect(() => component.removeEvidenceLink(0)).not.toThrow();
      component.resultDetail.set(buildDetail({ evidence: null }));
      expect(() => component.removeEvidenceLink(0)).not.toThrow();
    });

    it('removeEvidenceLink removes by index', () => {
      component.resultDetail.set(buildDetail({ evidence: [{ link: 'a' }, { link: 'b' }] }));
      component.removeEvidenceLink(0);
      expect((component.resultDetail() as any).evidence).toEqual([{ link: 'b' }]);
    });
  });

  // ------------------------------------------------------------------ lifecycle

  describe('lifecycle', () => {
    it('ngOnInit locks the body scroll', () => {
      component.ngOnInit();
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('ngOnDestroy restores the scroll and leaves readOnly untouched when nothing was saved', () => {
      rolesMock.readOnly = true;
      component.ngOnDestroy();
      expect(document.body.style.overflow).toBe('auto');
      expect(rolesMock.readOnly).toBe(true);
    });

    it('ngOnDestroy restores a saved readOnly value', () => {
      (component as any).savedReadOnly = true;
      rolesMock.readOnly = false;
      component.ngOnDestroy();
      expect(rolesMock.readOnly).toBe(true);
    });
  });

  // -------------------------------------------------------------------- effects

  describe('constructor effects', () => {
    it('loads the detail when the drawer becomes visible with a result', () => {
      const loadSpy = jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.resultToReview.set({ id: '77' } as any);
      component.visible.set(true);
      fixture.detectChanges();
      expect(loadSpy).toHaveBeenCalledWith('77');
    });

    it('does not load when the drawer is hidden', () => {
      const loadSpy = jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.resultToReview.set({ id: '77' } as any);
      fixture.detectChanges();
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('unlocks readOnly while the drawer is editable and restores it afterwards', () => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      apiMock.rolesSE.isAdmin = true;
      rolesMock.readOnly = true;

      component.visible.set(true);
      fixture.detectChanges();
      expect(rolesMock.readOnly).toBe(false);

      component.visible.set(false);
      fixture.detectChanges();
      expect(rolesMock.readOnly).toBe(true);
    });

    it('reapplies numeric contributing initiatives once the list arrives', async () => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.contributingInitiativesList.set([{ id: 1 }, { id: 2 }]);
      component.resultDetail.set(buildDetail({ contributingInitiatives: [1, 2] }));
      fixture.detectChanges();
      await macrotask();
      expect((component as any)._lastContributingInitiativesReapplyKey).toBe('101-2-2');
      expect((component.resultDetail() as any).contributingInitiatives).toEqual([1, 2]);

      // Re-running with the same key must not schedule a second reapply.
      fixture.detectChanges();
      await macrotask();
      expect((component as any)._lastContributingInitiativesReapplyKey).toBe('101-2-2');
    });

    it('does not reapply when the numeric list became empty', async () => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.contributingInitiativesList.set([{ id: 1 }]);
      component.resultDetail.set(buildDetail({ contributingInitiatives: [1] }));
      fixture.detectChanges();
      component.resultDetail.set(buildDetail({ contributingInitiatives: [] }));
      await macrotask();
      expect((component.resultDetail() as any).contributingInitiatives).toEqual([]);
    });

    it('skips the mapping effect when there is nothing to map', () => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.resultDetail.set(buildDetail({ contributingInitiatives: [1] }));
      fixture.detectChanges();
      expect(component.contributingInitiativesList()).toEqual([]);
    });

    it('maps string and object initiatives to ids', async () => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.contributingInitiativesList.set([
        { id: 1, official_code: 'SP01' },
        { id: 2, official_code: 'SP02' }
      ]);
      component.resultDetail.set(
        buildDetail({ contributingInitiatives: ['SP01', { id: '2' }, { official_code: 'SP02' }, { official_code: 'NOPE' }, '77'] })
      );
      fixture.detectChanges();
      await macrotask();
      const mapped = (component.resultDetail() as any).contributingInitiatives;
      expect(mapped[0]).toBe(1);
      expect(mapped[1]).toBe(2);
      expect(mapped[2]).toBe(2);
      expect(mapped[4]).toBe(77);
    });

    it('keeps unrecognisable initiative entries as-is', async () => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.contributingInitiativesList.set([{ id: 1, official_code: 'SP01' }]);
      component.resultDetail.set(buildDetail({ contributingInitiatives: ['SP01', { foo: 1 }, true] }));
      fixture.detectChanges();
      await macrotask();
      const mapped = (component.resultDetail() as any).contributingInitiatives;
      expect(mapped[0]).toBe(1);
      expect(mapped[1]).toEqual({ foo: 1 });
      expect(mapped[2]).toBe(true);
    });

    it('does not overwrite when the mapped ids already match', async () => {
      jest.spyOn(component as any, 'loadResultDetail').mockImplementation(() => undefined);
      component.contributingInitiativesList.set([{ id: 1, official_code: 'SP01' }]);
      component.resultDetail.set(buildDetail({ contributingInitiatives: [{ id: 1 }] }));
      fixture.detectChanges();
      // The mapping effect rewrites [{id:1}] -> [1]; a second pass finds nothing to change.
      await macrotask();
      fixture.detectChanges();
      await macrotask();
      expect((component.resultDetail() as any).contributingInitiatives).toEqual([1]);
    });
  });

  // ------------------------------------------------------------- validationStatus & scrollToToc

  describe('validationStatus', () => {
    it('returns approved state when status is 6', () => {
      component.resultToReview.set({ status_id: 6 } as any);
      const status = component.validationStatus();
      expect(status.type).toBe('approved');
      expect(status.isReady).toBe(true);
    });

    it('returns rejected state when status is 7', () => {
      component.resultToReview.set({ status_id: 7 } as any);
      const status = component.validationStatus();
      expect(status.type).toBe('rejected');
      expect(status.isReady).toBe(false);
    });

    it('returns missing-toc when ToC is not completed for pending result', () => {
      apiMock.rolesSE.isAdmin = true;
      component.resultToReview.set({ status_id: 5 } as any);
      component.isToCCompleted.set(false);
      const status = component.validationStatus();
      expect(status.type).toBe('missing-toc');
      expect(status.isReady).toBe(false);
    });

    it('returns unsaved-toc when ToC has unsaved changes', () => {
      apiMock.rolesSE.isAdmin = true;
      component.resultToReview.set({ status_id: 5 } as any);
      component.isToCCompleted.set(true);
      component.isTocDirty.set(true);
      const status = component.validationStatus();
      expect(status.type).toBe('unsaved-toc');
      expect(status.isReady).toBe(false);
    });

    it('returns unsaved-data when Data Standards has unsaved changes', () => {
      apiMock.rolesSE.isAdmin = true;
      component.resultToReview.set({ status_id: 5 } as any);
      component.isToCCompleted.set(true);
      component.isTocDirty.set(false);
      jest.spyOn(component, 'hasDataStandardUnsavedChanges').mockReturnValue(true);
      const status = component.validationStatus();
      expect(status.type).toBe('unsaved-data');
      expect(status.isReady).toBe(false);
    });

    it('returns ready when all requirements are met', () => {
      apiMock.rolesSE.isAdmin = true;
      component.resultToReview.set({ status_id: 5 } as any);
      component.isToCCompleted.set(true);
      component.isTocDirty.set(false);
      jest.spyOn(component, 'hasDataStandardUnsavedChanges').mockReturnValue(false);
      const status = component.validationStatus();
      expect(status.type).toBe('ready');
      expect(status.isReady).toBe(true);
    });
  });

  describe('scrollToToc', () => {
    it('scrolls into view when #review-card-toc exists', () => {
      const el = document.createElement('div');
      el.id = 'review-card-toc';
      el.scrollIntoView = jest.fn();
      document.body.appendChild(el);

      component.scrollToToc();

      expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      document.body.removeChild(el);
    });

    it('does not throw when #review-card-toc does not exist', () => {
      expect(() => component.scrollToToc()).not.toThrow();
    });
  });

  // ------------------------------------------------------------- BSR-T-5: drawer header Source
  // @akili-spec bilateral/review-list-source-and-reporter (BSR-T-5, BSR-R-9, BSR-AC-12)
  //
  // WHY A STATIC TEMPLATE READ, NOT A RENDERED ASSERTION HERE
  // ----------------------------------------------------------
  // This whole spec file bootstraps with `overrideComponent({ set: { template: '' } })` (see the
  // `beforeEach` above), so jsdom never renders `result-review-drawer.component.html` in THIS
  // file — the same constraint `result-review-drawer.readonly-bindings.spec.ts` (RDR-T-1) hit and
  // resolved the same way: read the real shipped `.html` off disk (a real-artifact lock, not a
  // fragment authored in the test) to prove the TEMPLATE actually wires `headerSourceOf(...)` into
  // the header, paired with a correctness assertion that `headerSourceOf('MANUAL')` really is the
  // string `Manual entry`. Together they cover what "the header renders Manual entry" requires:
  // the template feeds the chip the right expression, AND that expression produces the right text.
  // The genuinely RENDERED proof (jsdom vs. a real DOM painting "Manual entry") lives in the
  // sibling CT harness `result-review-drawer.header-source.cy.ts` — mounting the full
  // `ResultReviewDrawerComponent` in Cypress CT was already judged impractical for this exact
  // component (`result-review-drawer.approve-tooltip.cy.ts`'s documented mount decision: ~15
  // further real services behind `ApiService`, a constructor `effect()` that fires three chained
  // HTTP calls, and five further child-component dependency graphs).
  //
  // FALSIFIER: delete `[source]="headerSourceOf(fields?.commonFields)"` (or the
  // `app-bilateral-review-source-chip` element around it) from the header block in
  // `result-review-drawer.component.html` → the template-lock test below goes red, naming the
  // missing binding. A test that only asserted `BilateralCommonFields.creation_method` compiles
  // would NOT catch that mutation — this is why the lock reads the shipped template text instead.
  describe('BSR-T-5: drawer header Source (headerSourceOf + template wiring)', () => {
    const TEMPLATE_PATH = path.join(__dirname, 'result-review-drawer.component.html');

    it('headerSourceOf derives "Manual entry" for a MANUAL result (BSR-AC-12)', () => {
      const descriptor = component.headerSourceOf({ creation_method: 'MANUAL' } as any);
      expect(descriptor).toEqual({
        kind: 'pill',
        label: BILATERAL_REVIEW_COPY.sourceChip.manualEntry,
        accessibleName: BILATERAL_REVIEW_COPY.sourceChip.manualEntryAccessibleName
      });
      expect(descriptor).toMatchObject({ label: 'Manual entry' });
    });

    it('headerSourceOf derives the AI descriptor for an AI result — no second copy of the AI string here', () => {
      const descriptor = component.headerSourceOf({ creation_method: 'AI' } as any);
      expect(descriptor).toEqual({ kind: 'ai' });
    });

    it('headerSourceOf reads undefined/absent commonFields without throwing (placeholder branch)', () => {
      expect(component.headerSourceOf(undefined)).toEqual({ kind: 'placeholder' });
      expect(component.headerSourceOf(null)).toEqual({ kind: 'placeholder' });
    });

    it('headerSourceOf derives "Manual entry" for a MANUAL result even when submitter_name is null (BSR-AC-12 attaches no submitter_name precondition)', () => {
      const descriptor = component.headerSourceOf({ creation_method: 'MANUAL', submitter_name: null } as any);
      expect(descriptor).toEqual({
        kind: 'pill',
        label: BILATERAL_REVIEW_COPY.sourceChip.manualEntry,
        accessibleName: BILATERAL_REVIEW_COPY.sourceChip.manualEntryAccessibleName
      });
    });

    // ----------------------------------------------------------------- attempt-2 remediation
    // Attempt 1's lock (`block.toContain('app-bilateral-review-source-chip')` over 800 chars
    // after "Submitted by:") passed IDENTICALLY whether the Source markup sat inside or outside
    // the `@if (fields?.commonFields?.submitter_name)` block — a string-presence check on markup
    // that is satisfied either way, which is why it PASSed a template that violated BSR-R-9 (the
    // Source line disappeared for every result whose `external_submitter` is unstamped, the exact
    // MANUAL/AI class BSR-AC-12 names). This replacement proves PLACEMENT, not mere presence: it
    // brace-matches from the submitter_name `@if`'s own opening `{` to find the `}` that closes
    // THAT block, then asserts the Source chip's markup index is AFTER it — i.e. Source is a
    // sibling of the `@if`, never nested inside it. `{{ }}` interpolations inside the block are
    // balanced pairs (each contributes net 0 to depth), so a plain per-character brace counter
    // still lands on the correct closing `}` without needing to special-case them.
    //
    // FALSIFIER (run manually for the task report, not re-asserted here — see the Implementer's
    // verification section): re-nest the Source `<span>` back inside
    // `@if (fields?.commonFields?.submitter_name) { ... }` → `chipIndex` falls BEFORE
    // `submitterBlockCloseIndex` and this test goes red on the last `expect`, not on setup.
    it('the real shipped template renders the Source chip OUTSIDE (after) the @if (fields?.commonFields?.submitter_name) block — an index-comparison lock, not a string-presence one', () => {
      expect(fs.existsSync(TEMPLATE_PATH)).toBe(true);
      const html = fs.readFileSync(TEMPLATE_PATH, 'utf8');
      expect(html.length).toBeGreaterThan(0);

      const ifMarker = '@if (fields?.commonFields?.submitter_name) {';
      const ifIndex = html.indexOf(ifMarker);
      expect(ifIndex).toBeGreaterThan(-1);

      // Constraint this brace counter relies on (attempt-3 rework, Reviewer advisory (b)): it only
      // sees `{`/`}` characters, so it would mis-locate the closing brace if this block ever grew
      // an `@else { ... }` (more braces to the SAME depth run) or an unbalanced `{`/`}` inside an
      // attribute string (e.g. a literal `"{"` in a label) between `ifIndex` and the real close.
      // Neither exists in the shipped block today; a future edit that adds either must re-verify
      // this loop by eye, not trust the counter blindly.
      let depth = 1;
      let cursor = ifIndex + ifMarker.length;
      for (; cursor < html.length && depth > 0; cursor++) {
        if (html[cursor] === '{') depth++;
        else if (html[cursor] === '}') depth--;
      }
      expect(depth).toBe(0); // sanity: the block's own `{`/`}` are balanced in the shipped file
      const submitterBlockCloseIndex = cursor - 1; // index of the matching closing `}`

      const chipIndex = html.indexOf('app-bilateral-review-source-chip');
      expect(chipIndex).toBeGreaterThan(-1);
      expect(html).toContain('[source]="headerSourceOf(fields?.commonFields)"');

      expect(chipIndex).toBeGreaterThan(submitterBlockCloseIndex);

      // [advisory-grade] attempt-3 rework, Reviewer advisory (a): the check above proves the chip
      // is not nested INSIDE this specific submitter_name @if block, but says nothing about a
      // hypothetical SIBLING `@if (…submitter_name) { <Source> }` reinserted between this block's
      // close and the chip — that would still satisfy `chipIndex > submitterBlockCloseIndex` and
      // pass. A naive "no `submitter_name` text at all in between" check is too strong: the real,
      // reviewed-and-passed separator `@if (project_name || submitter_name) { <span>•</span> }`
      // legitimately sits in that gap and mentions `submitter_name` without wrapping the chip. The
      // real test for the loophole is narrower: find every `@if (...)` between the two markers
      // whose CONDITION mentions `submitter_name`, brace-match each one the same way as above, and
      // confirm its own close falls BEFORE `chipIndex` — i.e. it is a self-contained sibling (like
      // the separator), never a block that WRAPS the chip. See this file's next test for the proof.
      const gapText = html.slice(submitterBlockCloseIndex, chipIndex);
      const conditionalRe = /@if \(([^)]*)\) \{/g;
      let match: RegExpExecArray | null;
      while ((match = conditionalRe.exec(gapText)) !== null) {
        if (!match[1].includes('submitter_name')) continue;
        const nestedIfIndex = submitterBlockCloseIndex + match.index;
        const nestedIfMarkerEnd = nestedIfIndex + match[0].length;
        let nestedDepth = 1;
        let nestedCursor = nestedIfMarkerEnd;
        for (; nestedCursor < html.length && nestedDepth > 0; nestedCursor++) {
          if (html[nestedCursor] === '{') nestedDepth++;
          else if (html[nestedCursor] === '}') nestedDepth--;
        }
        const nestedCloseIndex = nestedCursor - 1;
        expect(nestedCloseIndex).toBeLessThan(chipIndex);
      }
    });

    // Falsification proof for advisory (a) above — NOT a gate that runs against the shipped file;
    // it reconstructs the exact loophole shape (a submitter_name @if reinserted so it WRAPS the
    // chip, between the first block's close and the chip) against an in-memory string and shows
    // the narrowed check catches it while leaving the real separator @if alone. Mirrors this
    // file's other manually-verified FALSIFIER comments, made executable here since the shape is
    // easy to construct without touching the real template.
    it('[advisory-grade] falsifier: a submitter_name @if reinserted so it WRAPS the chip defeats the index-comparison lock alone, but is caught by the narrowed wrap-check', () => {
      const realHtml = fs.readFileSync(TEMPLATE_PATH, 'utf8');
      const ifMarker = '@if (fields?.commonFields?.submitter_name) {';
      const ifIndex = realHtml.indexOf(ifMarker);
      let depth = 1;
      let cursor = ifIndex + ifMarker.length;
      for (; cursor < realHtml.length && depth > 0; cursor++) {
        if (realHtml[cursor] === '{') depth++;
        else if (realHtml[cursor] === '}') depth--;
      }
      const realCloseIndex = cursor - 1;
      const realChipIndex = realHtml.indexOf('app-bilateral-review-source-chip');
      const chipEnd = realHtml.indexOf('/>', realChipIndex) + '/>'.length;

      // Re-wrap the chip in a second submitter_name-gated block — the loophole shape the Reviewer
      // named. The plain index-comparison check (chipIndex > submitterBlockCloseIndex, computed
      // off the FIRST block) still passes against this string, since the chip's start index is
      // unchanged and still after the first block's close.
      const openTag = ' @if (fields?.commonFields?.submitter_name) { ';
      const closeTag = ' } ';
      const poisonedHtml = realHtml.slice(0, realChipIndex) + openTag + realHtml.slice(realChipIndex, chipEnd) + closeTag + realHtml.slice(chipEnd);

      expect(realChipIndex).toBeGreaterThan(realCloseIndex); // the plain lock alone would still PASS

      // Re-run the narrowed check against the poisoned string: the reinserted @if's condition
      // mentions submitter_name, and — because it now WRAPS the chip — its brace-matched close
      // falls AFTER the chip, not before it. That is exactly what the new assertion rejects.
      const gapText = poisonedHtml.slice(realCloseIndex, realChipIndex + openTag.length + (chipEnd - realChipIndex));
      const conditionalRe = /@if \(([^)]*)\) \{/g;
      let match: RegExpExecArray | null;
      let foundWrappingBlock = false;
      while ((match = conditionalRe.exec(gapText)) !== null) {
        if (!match[1].includes('submitter_name')) continue;
        const nestedIfIndex = realCloseIndex + match.index;
        const nestedIfMarkerEnd = nestedIfIndex + match[0].length;
        let nestedDepth = 1;
        let nestedCursor = nestedIfMarkerEnd;
        for (; nestedCursor < poisonedHtml.length && nestedDepth > 0; nestedCursor++) {
          if (poisonedHtml[nestedCursor] === '{') nestedDepth++;
          else if (poisonedHtml[nestedCursor] === '}') nestedDepth--;
        }
        const nestedCloseIndex = nestedCursor - 1;
        const poisonedChipIndex = realChipIndex + openTag.length;
        if (nestedCloseIndex > poisonedChipIndex) {
          foundWrappingBlock = true;
        }
      }
      expect(foundWrappingBlock).toBe(true); // the narrowed check DOES catch the re-nesting, as intended
    });
  });
});
