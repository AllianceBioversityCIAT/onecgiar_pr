import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';
import { RdContributorsAndPartnersService } from './rd-contributors-and-partners.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { InnovationUseResultsService } from '../../../../../../shared/services/global/innovation-use-results.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { FeedbackValidationDirectiveModule } from '../../../../../../shared/directives/feedback-validation-directive.module';

/**
 * P2-3322 — zoneless change detection regression guard for the Lead center / Lead partner selects.
 *
 * `RdContributorsAndPartnersService.updatingLeadData` is raised to hide the select while the possible-leads
 * list is recomputed and cleared again inside a `setTimeout(..., 25)`. That delayed write notified nothing,
 * so under zoneless change detection the select stayed hidden behind `*ngIf="!updatingLeadData"` until the
 * page was reloaded. These tests use the REAL service, drive a real DOM click and assert on the rendered DOM.
 */
describe('RdContributorsAndPartnersComponent — lead selects under zoneless change detection', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let rdPartnersSE: RdContributorsAndPartnersService;

  const centersList = [
    { code: 'C1', name: 'Center 1', full_name: 'Center 1', institutionId: 11 },
    { code: 'C2', name: 'Center 2', full_name: 'Center 2', institutionId: 22 }
  ];

  const leadCenterSelectEl = () => fixture.nativeElement.querySelector('app-pr-select[label="Lead center"]');
  const centerChipDeleteEl = () => fixture.nativeElement.querySelector('.centers .center .material-icons-round');

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const currentResult = {
      id: 1,
      result_code: 'R-1',
      version_id: 1,
      portfolio: 'P25',
      initiative_id: 5,
      initiative_official_code: 'INIT-05',
      status: null
    };

    const apiMock = {
      dataControlSE: {
        currentResult,
        currentResultSignal: signal(currentResult),
        currentResultSectionName: signal(''),
        findClassTenSeconds: jest.fn().mockResolvedValue(true),
        isKnowledgeProduct: false,
        showPartnersRequest: false
      },
      resultsSE: {
        GET_resultById: jest.fn().mockReturnValue(of({ response: currentResult })),
        GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [CommonModule, TermPipe],
      providers: [
        provideZonelessChangeDetection(),
        RdContributorsAndPartnersService,
        { provide: ApiService, useValue: apiMock },
        { provide: RolesService, useValue: { readOnly: false } },
        {
          provide: InstitutionsService,
          useValue: { loadedInstitutions: new BehaviorSubject<boolean>(false), institutionsList: [], institutionsWithoutCentersList: [] }
        },
        { provide: CentersService, useValue: { loadedCenters: new BehaviorSubject<boolean>(false), centersList, centers: signal(centersList) } },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: ResultLevelService, useValue: { currentResultLevelId: 2 } },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        {
          provide: FieldsManagerService,
          useValue: { isContributorsPartners2026: () => false, isP25: () => true, activeIndicatorsLength: () => 0, hasSelectedIndicator: () => false }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    jest.spyOn(rdPartnersSE, 'getSectionInformation').mockImplementation(() => undefined as any);
    jest.spyOn(rdPartnersSE, 'loadFilteredBilateralProjects').mockImplementation(() => undefined as any);

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    // `ngOnInit` calls `resetState()`, so the precondition (one contributing center, lead by center) is seeded
    // afterwards. Setup only — the assertion below is driven by a real DOM click.
    rdPartnersSE.partnersBody.contributing_center = [{ ...centersList[0] } as any];
    rdPartnersSE.partnersBody.is_lead_by_partner = false;
    rdPartnersSE.possibleLeadCenters = [{ ...centersList[0] } as any];
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('re-shows the Lead center select after removing a contributing center chip', async () => {
    expect(leadCenterSelectEl()).toBeTruthy();
    expect(centerChipDeleteEl()).toBeTruthy();

    // Real flow: `(click)="deleteContributingCenter(i); rdPartnersSE.setPossibleLeadCenters(true)"`.
    centerChipDeleteEl().click();
    await fixture.whenStable();

    // The service hides the select synchronously before recomputing the possible leads.
    expect(leadCenterSelectEl()).toBeFalsy();

    await tick(80);

    expect(rdPartnersSE.updatingLeadData).toBe(false);
    expect(leadCenterSelectEl()).toBeTruthy();
  });

  it('re-shows the Lead center select after deleteContributingCenter(index, true)', async () => {
    expect(leadCenterSelectEl()).toBeTruthy();

    // The `updateComponent = true` branch owns its own `setTimeout(..., 50)` on the same flag.
    fixture.componentInstance.deleteContributingCenter(0, true);
    await fixture.whenStable();

    expect(leadCenterSelectEl()).toBeFalsy();

    await tick(120);

    expect(rdPartnersSE.updatingLeadData).toBe(false);
    expect(leadCenterSelectEl()).toBeTruthy();
  });
});

/**
 * P2-3190 — the CGIAR centers dropdown renders nothing when the CLARISA catalogue resolves AFTER the view is built.
 *
 * `referenceCenters()` / `otherCentersList()` are `computed()`s. Before the fix they read
 * `centersSE.centersList`, a PLAIN ARRAY: not a reactive dependency, so the first evaluation cached the empty
 * catalogue and nothing ever invalidated it. The only other dependency, `tocReferenceCenterInstitutionIds()`,
 * never changes for a result that is not aligned to a work package — which is why that case failed every time.
 *
 * These tests render the REAL `app-pr-multi-select` and assert on the DOM the user sees (the option rows and the
 * "No information found" empty state), never on the component's internal arrays.
 */
describe('RdContributorsAndPartnersComponent — CGIAR centers dropdown with a late CLARISA catalogue (P2-3190)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let rdPartnersSE: RdContributorsAndPartnersService;
  let centersMock: { centersList: any[]; centers: ReturnType<typeof signal<any[]>>; loadedCenters: BehaviorSubject<boolean> };

  const CATALOG = [
    { code: 'AAA', name: 'Alliance', full_name: 'Alliance of Bioversity and CIAT', acronym: 'ABC', institutionId: 11 },
    { code: 'BBB', name: 'IRRI', full_name: 'International Rice Research Institute', acronym: 'IRRI', institutionId: 22 },
    { code: 'CCC', name: 'ILRI', full_name: 'International Livestock Research Institute', acronym: 'ILRI', institutionId: 33 }
  ];

  /** The "Other(s)" multi-select — the one that auto-activates when the ToC brought no reference centers.
   *  Selects via the `data-testid="toc-other-centers"` hook (RB-S1): once `label` becomes a property
   *  binding it no longer reflects as a queryable DOM attribute, so `[label="…"]` never matches. */
  const otherCentersSelectEl = () => fixture.nativeElement.querySelector('[data-testid="toc-other-centers"]');
  /** Science equivalent of `otherCentersSelectEl` — the auto-activated dropdown that carries
   *  `data-testid="toc-other-science"` (OTV-R-2 / OTV-AC-2 / OTV-AC-7 Science half). */
  const otherScienceSelectEl = () => fixture.nativeElement.querySelector('[data-testid="toc-other-science"]');
  const emptyStateText = () => otherCentersSelectEl()?.querySelector('.no_info')?.textContent?.trim() ?? null;
  const renderedOptionLabels = () =>
    Array.from(otherCentersSelectEl()?.querySelectorAll('.option .label') ?? []).map((el: any) => el.textContent.trim());

  beforeEach(async () => {
    const currentResult = {
      id: 8675,
      result_code: 'R-8675',
      version_id: 1,
      portfolio: 'P26',
      initiative_id: 5,
      initiative_official_code: 'INIT-05',
      status: null
    };

    const apiMock = {
      dataControlSE: {
        currentResult,
        currentResultSignal: signal(currentResult),
        currentResultSectionName: signal(''),
        findClassTenSeconds: jest.fn().mockResolvedValue(true),
        isKnowledgeProduct: false,
        showPartnersRequest: false
      },
      resultsSE: {
        GET_resultById: jest.fn().mockReturnValue(of({ response: currentResult })),
        GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    // The CLARISA catalogue has NOT resolved yet when the component is created.
    centersMock = { centersList: [], centers: signal<any[]>([]), loadedCenters: new BehaviorSubject<boolean>(false) };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [CommonModule, FormsModule, HttpClientTestingModule, TermPipe, CustomFieldsModule],
      providers: [
        provideZonelessChangeDetection(),
        RdContributorsAndPartnersService,
        { provide: ApiService, useValue: apiMock },
        { provide: RolesService, useValue: { readOnly: false } },
        {
          provide: InstitutionsService,
          useValue: { loadedInstitutions: new BehaviorSubject<boolean>(false), institutionsList: [], institutionsWithoutCentersList: [] }
        },
        { provide: CentersService, useValue: centersMock },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: ResultLevelService, useValue: { currentResultLevelId: 2 } },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        {
          provide: FieldsManagerService,
          useValue: { isContributorsPartners2026: () => true, isP25: () => false, activeIndicatorsLength: () => 0, hasSelectedIndicator: () => false }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    jest.spyOn(rdPartnersSE, 'getSectionInformation').mockImplementation(() => undefined as any);
    jest.spyOn(rdPartnersSE, 'loadFilteredBilateralProjects').mockImplementation(() => undefined as any);

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders the centers once the CLARISA catalogue resolves after the view was built', async () => {
    // The result is not aligned to a work package, so the ToC brings no reference centers and the
    // "Other(s)" dropdown auto-activates with the WHOLE catalogue (AC4).
    expect(otherCentersSelectEl()).toBeTruthy();
    expect(emptyStateText()).toBe('No information found');

    // The CLARISA response lands now — after the dropdown was already built.
    centersMock.centersList = CATALOG;
    centersMock.centers.set(CATALOG);
    centersMock.loadedCenters.next(true);
    await fixture.whenStable();

    expect(emptyStateText()).toBeNull();
    expect(renderedOptionLabels()).toEqual(CATALOG.map(c => c.full_name));
  });

  /** OTV-AC-7 regression guard: the empty-ToC relabel (OTV-R-1) must not touch the genuine opt-in case —
   *  when the ToC DID find centers and the user picks the "Other(s)" sentinel from the primary dropdown,
   *  the second dropdown must still read "Other(s) Contributing CGIAR Centers", unchanged from today. */
  it('keeps the "Other(s)" label when the ToC found centers and the user opts into the sentinel (OTV-AC-7)', async () => {
    centersMock.centersList = CATALOG;
    centersMock.centers.set(CATALOG);
    centersMock.loadedCenters.next(true);
    rdPartnersSE.tocReferenceCenterInstitutionIds.set([11]);
    await fixture.whenStable();

    expect(fixture.componentInstance.hasReferenceCenters()).toBe(true);

    // User opts in: selects the "Other(s)" sentinel from the primary (ToC-found) dropdown.
    rdPartnersSE.partnersBody.contributing_center = [
      { code: fixture.componentInstance.OTHER_CENTERS_CODE, name: 'Other(s) CGIAR Centers' } as any
    ];
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();

    const otherCentersEl = otherCentersSelectEl();
    expect(otherCentersEl).toBeTruthy();
    // `.pr_label` renders the label text with a trailing colon (`useColon`) appended by app-pr-field-header.
    expect(otherCentersEl?.querySelector('.pr_label')?.textContent?.trim()).toBe('Other(s) Contributing CGIAR Centers:');
  });

  /** OTV-R-1 / OTV-AC-1: the actual bug being fixed — the empty-ToC Centers dropdown must resolve to the
   *  component's own primary label, NOT the stale "Other(s) Contributing CGIAR Centers" text. Asserting on
   *  the resolved `.pr_label` text (not just element presence) is what makes this catch a reverted/backwards
   *  `[label]` ternary — see `requirements.md` §7.1 row 1 and the RED evidence below. */
  it('resolves the empty-ToC Centers label to "Contributing CGIAR Centers", not "Other(s)…" (OTV-R-1, OTV-AC-1)', () => {
    const labelText = otherCentersSelectEl()?.querySelector('.pr_label')?.textContent?.trim();
    expect(labelText).toBe('Contributing CGIAR Centers:');
    expect(labelText).not.toContain('Other(s)');
  });

  /** OTV-R-2 / OTV-AC-2: Science half of the same defect — `data-testid="toc-other-science"` was previously
   *  asserted nowhere in this suite. */
  it('resolves the empty-ToC Science label to "Contributing Science Program/Accelerator", not "Other(s)…" (OTV-R-2, OTV-AC-2)', () => {
    const labelText = otherScienceSelectEl()?.querySelector('.pr_label')?.textContent?.trim();
    expect(labelText).toBe('Contributing Science Program/Accelerator:');
    expect(labelText).not.toContain('Other(s)');
  });

  /** requirements.md §7.1 row 3 (duplicate/stacked field label, the exact defect Judgment Day round 1 found):
   *  the empty-ToC `@else` branches removed their own redundant `app-pr-field-header` (design.md §6.2) so the
   *  dropdown's own internal header is the ONLY place either label renders. `app-pr-multi-select` always nests
   *  its OWN internal `app-pr-field-header` (design.md §10) — so "no header at all" would be the wrong shape;
   *  the correct check is "no header OUTSIDE the testid'd element carries the same label text". */
  it('does not duplicate the Centers/Science label outside the testid\'d dropdown in the empty-ToC state (§7.1 row 3)', () => {
    const allHeaders: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('app-pr-field-header'));
    const centersEl = otherCentersSelectEl();
    const scienceEl = otherScienceSelectEl();

    const outsideHeaders = allHeaders.filter(h => !centersEl?.contains(h) && !scienceEl?.contains(h));
    const duplicateCenters = outsideHeaders.filter(h => h.textContent?.includes('Contributing CGIAR Centers'));
    const duplicateScience = outsideHeaders.filter(h => h.textContent?.includes('Contributing Science Program'));

    expect(duplicateCenters.length).toBe(0);
    expect(duplicateScience.length).toBe(0);
  });

  /** OTV-AC-7 Science half — mirrors the Centers opt-in test above: when the ToC DID find Science Programs and
   *  the user picks the "Other(s)" sentinel from the primary dropdown, the second dropdown must still read
   *  "Other(s) Science Program(s)", unchanged from today. Closes the gap the Reviewer found (zero Science
   *  coverage of OTV-AC-7). */
  it('keeps the "Other(s)" label when the ToC found Science Programs and the user opts into the sentinel (OTV-AC-7 Science)', async () => {
    const SP_CATALOG = [{ id: 501, official_code: 'SP1', short_name: 'Science Program 1', full_name: 'Science Program 1' }];
    fixture.componentInstance.allScienceProgramsList.set(SP_CATALOG as any);
    rdPartnersSE.tocReferenceSynergyInitiativeIds.set([501]);
    await fixture.whenStable();

    expect(fixture.componentInstance.hasReferenceScience()).toBe(true);

    // User opts in: selects the "Other(s)" sentinel from the primary (ToC-found) Science dropdown.
    rdPartnersSE.scienceSelected = [
      { id: fixture.componentInstance.OTHER_SP_CODE, official_code: 'Other(s)', short_name: 'Science Program(s)' } as any
    ];
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();

    const otherScienceEl = otherScienceSelectEl();
    expect(otherScienceEl).toBeTruthy();
    expect(otherScienceEl?.querySelector('.pr_label')?.textContent?.trim()).toBe('Other(s) Science Program(s):');
  });

  it('rebuilds the ToC-derived dropdown too when the catalogue arrives after the ToC ids', async () => {
    // ToC resolved first (ids only), catalogue still missing → nothing to show.
    rdPartnersSE.tocReferenceCenterInstitutionIds.set([11, 33]);
    await fixture.whenStable();

    const dropdown1 = () => fixture.nativeElement.querySelector('app-pr-multi-select[label="Contributing CGIAR Centers"]');
    const dropdown1Labels = () => Array.from(dropdown1()?.querySelectorAll('.option .label') ?? []).map((el: any) => el.textContent.trim());

    // The ids alone cannot be resolved against a catalogue that has not arrived, so the only row offered
    // is the "Other(s)" sentinel: the two ToC centers the user should be seeing are missing.
    expect(dropdown1()).toBeTruthy();
    expect(dropdown1Labels()).toEqual(['Other(s) CGIAR Centers']);

    centersMock.centersList = CATALOG;
    centersMock.centers.set(CATALOG);
    centersMock.loadedCenters.next(true);
    await fixture.whenStable();

    expect(dropdown1Labels()).toEqual([
      'Alliance of Bioversity and CIAT',
      'International Livestock Research Institute',
      'Other(s) CGIAR Centers'
    ]);
  });
});

/**
 * P2-3249 — the "Contributing CGIAR Centers" mandatory marker must actually reach the mandatory-field scan.
 *
 * 🛑 `[required]` is NOT what makes a field mandatory on this screen. `DataControlService`
 * `.someMandatoryFieldIncompleteResultDetail()` reads two CSS selectors out of the live DOM and nothing else,
 * and `pr-multi-select` — the component behind every centres dropdown here — emits NEITHER of them
 * (`custom-fields/pr-multi-select/CLAUDE.md`). So these tests render the REAL template, run the REAL scan over
 * the REAL DOM, and assert on the feedback list the user sees in the bottom bar. Asserting on the component's
 * getters would pass even if the marker were missing from the template altogether.
 */
describe('RdContributorsAndPartnersComponent — Contributing CGIAR Centers mandatory marker in the DOM (P2-3249)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let rdPartnersSE: RdContributorsAndPartnersService;
  let dataControl: DataControlService;
  let is2026: ReturnType<typeof signal<boolean>>;

  const CATALOG = [
    { code: 'AAA', name: 'Alliance', full_name: 'Alliance of Bioversity and CIAT', acronym: 'ABC', institutionId: 11 },
    { code: 'BBB', name: 'IRRI', full_name: 'International Rice Research Institute', acronym: 'IRRI', institutionId: 22 },
    { code: 'ZZZ', name: 'Other Center', full_name: 'A Center the ToC never mentioned', acronym: 'OTH', institutionId: 99 }
  ];

  const TOC_LABEL = 'Contributing CGIAR Centers (at least one from the ToC)';
  const PLAIN_LABEL = 'Contributing CGIAR Centers';

  /** The hidden `appFeedbackValidation` host, and the `.pr-field.mandatory` node the scan actually reads. */
  const markerEl = () => fixture.nativeElement.querySelector('[data-testid="cp-centers-mandatory-marker"]');
  const markerFieldEl = () => markerEl()?.querySelector('.pr-field.mandatory') ?? null;
  const validationNoteText = () =>
    fixture.nativeElement.querySelector('[data-testid="cp-centers-validation"] p')?.textContent?.trim() ?? null;

  /** Run the production scan over the rendered section and return the labels it collected. */
  const scan = (): { incomplete: boolean; labels: string[] } => {
    const incomplete = dataControl.someMandatoryFieldIncompleteResultDetail('.section_container');
    return { incomplete, labels: dataControl.fieldFeedbackList() };
  };

  const repaint = async () => {
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    is2026 = signal(true);

    const currentResult = {
      id: 3249,
      result_code: 'R-3249',
      version_id: 1,
      portfolio: 'P26',
      initiative_id: 5,
      initiative_official_code: 'INIT-05',
      status: null
    };

    const apiMock = {
      dataControlSE: {
        currentResult,
        currentResultSignal: signal(currentResult),
        currentResultSectionName: signal(''),
        findClassTenSeconds: jest.fn().mockResolvedValue(true),
        isKnowledgeProduct: false,
        showPartnersRequest: false
      },
      resultsSE: {
        GET_resultById: jest.fn().mockReturnValue(of({ response: currentResult })),
        GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] })),
        PATCH_ContributorsPartners: jest.fn().mockReturnValue(of({}))
      },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [CommonModule, FormsModule, HttpClientTestingModule, TermPipe, CustomFieldsModule, FeedbackValidationDirectiveModule],
      providers: [
        provideZonelessChangeDetection(),
        RdContributorsAndPartnersService,
        { provide: ApiService, useValue: apiMock },
        { provide: RolesService, useValue: { readOnly: false } },
        {
          provide: InstitutionsService,
          useValue: { loadedInstitutions: new BehaviorSubject<boolean>(false), institutionsList: [], institutionsWithoutCentersList: [] }
        },
        { provide: CentersService, useValue: { centersList: CATALOG, centers: signal<any[]>(CATALOG), loadedCenters: new BehaviorSubject(true) } },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: ResultLevelService, useValue: { currentResultLevelId: 2 } },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        {
          provide: FieldsManagerService,
          useValue: {
            isContributorsPartners2026: () => is2026(),
            isP25: () => false,
            activeIndicatorsLength: () => 0,
            hasSelectedIndicator: () => false
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    jest.spyOn(rdPartnersSE, 'getSectionInformation').mockImplementation(() => undefined as any);
    jest.spyOn(rdPartnersSE, 'loadFilteredBilateralProjects').mockImplementation(() => undefined as any);

    dataControl = new DataControlService({ setTitle: jest.fn() } as any, { GET_versioning: jest.fn() } as any);

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    // The production scan targets `.section_container`, which belongs to the result-detail shell above this
    // component. Stamping it on the fixture host exercises the real selector instead of a stand-in.
    fixture.nativeElement.classList.add('section_container');
    fixture.detectChanges();
    await fixture.whenStable();

    // ⚠️ AFTER the first detectChanges, never before: `ngOnInit` calls `resetState()`, which sets
    // `sectionHydratedFromToc` back to false (`service.ts:156`). Set too early, the flag is wiped and the ToC
    // preselection effect quietly fills `contributing_center` for us — the tests then assert on a field the
    // component populated, not on the selection they set.
    rdPartnersSE.sectionHydratedFromToc.set(true);
    rdPartnersSE.tocSelectionTouched.set(false);
  });

  it('emits a scannable `.pr-field.mandatory` — the dropdown itself emits none, which is why the marker exists', async () => {
    rdPartnersSE.tocReferenceCenterInstitutionIds.set([11, 22]);
    await repaint();

    expect(markerFieldEl()).toBeTruthy();

    // The trap this guards: neither centres dropdown contributes a scannable node of its own.
    const dropdown = fixture.nativeElement.querySelector('[data-testid="cp-field-contributing_center"]');
    expect(dropdown).toBeTruthy();
    expect(dropdown.querySelector('.pr-field.mandatory')).toBeNull();
  });

  it('lists the field as missing, naming the ToC condition, when the ToC brought centres and none is selected', async () => {
    rdPartnersSE.tocReferenceCenterInstitutionIds.set([11, 22]);
    rdPartnersSE.partnersBody.contributing_center = [];
    await repaint();

    expect(markerFieldEl().classList.contains('complete')).toBe(false);
    const { incomplete, labels } = scan();
    expect(incomplete).toBe(true);
    expect(labels).toContain(TOC_LABEL);
    expect(validationNoteText()).toContain('Theory of Change');
  });

  it('drops the field from the missing list once a ToC centre is selected', async () => {
    rdPartnersSE.tocReferenceCenterInstitutionIds.set([11, 22]);
    rdPartnersSE.partnersBody.contributing_center = [CATALOG[0]] as any;
    await repaint();

    expect(markerFieldEl().classList.contains('complete')).toBe(true);
    expect(scan().labels).not.toContain(TOC_LABEL);
    expect(validationNoteText()).toBeNull();
  });

  // THE ticket: "Other(s)" centres cannot satisfy the minimum on their own.
  it('keeps listing the field when every ToC centre is replaced by "Other(s)" centres', async () => {
    rdPartnersSE.tocReferenceCenterInstitutionIds.set([11, 22]);
    rdPartnersSE.partnersBody.contributing_center = [{ code: fixture.componentInstance.OTHER_CENTERS_CODE } as any];
    rdPartnersSE.otherCentersSelected = [CATALOG[2]] as any;
    await repaint();

    // The user really did pick a centre — it just is not a ToC one.
    expect(rdPartnersSE.otherCentersSelected.length).toBe(1);
    expect(markerFieldEl().classList.contains('complete')).toBe(false);
    expect(scan().labels).toContain(TOC_LABEL);
  });

  it('accepts an "Other(s)" centre alone when the ToC brought no centres at all (P2-3324 / P2-3326 branch)', async () => {
    rdPartnersSE.tocReferenceCenterInstitutionIds.set([]);
    await repaint();
    expect(fixture.componentInstance.hasReferenceCenters()).toBe(false);

    // Empty: still mandatory, but under the plain label — nothing from the ToC can be demanded here.
    expect(markerFieldEl().classList.contains('complete')).toBe(false);
    expect(scan().labels).toContain(PLAIN_LABEL);
    expect(validationNoteText()).not.toContain('Theory of Change');

    rdPartnersSE.otherCentersSelected = [CATALOG[2]] as any;
    await repaint();
    expect(markerFieldEl().classList.contains('complete')).toBe(true);
    expect(scan().labels).not.toContain(PLAIN_LABEL);
  });

  /**
   * The visible requiredness marker — the red asterisk `app-pr-field-header` paints from `.pr_label.required`
   * (`pr-field-header.component.scss:1`). It is a THIRD, purely visual layer: it is not what the scan reads
   * (`src/CLAUDE.md` §21.5), so it needs its own assertion or flipping `[required]` back to false goes unnoticed.
   */
  describe('the requiredness asterisk', () => {
    const isRequired = (testid: string) => {
      const host = fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
      expect(host).toBeTruthy();
      return host.querySelector('.pr_label')?.classList.contains('required') ?? false;
    };

    it('marks the ToC dropdown required, and leaves the optional "Other(s)" one unmarked', async () => {
      rdPartnersSE.tocReferenceCenterInstitutionIds.set([11, 22]);
      // Opt into "Other(s)" so the second dropdown is painted alongside the first.
      rdPartnersSE.partnersBody.contributing_center = [{ code: fixture.componentInstance.OTHER_CENTERS_CODE } as any];
      await repaint();

      expect(isRequired('cp-field-contributing_center')).toBe(true);
      expect(isRequired('toc-other-centers')).toBe(false);
    });

    it('marks the "Other(s)" dropdown required when it IS the field (no ToC centres)', async () => {
      rdPartnersSE.tocReferenceCenterInstitutionIds.set([]);
      await repaint();

      expect(isRequired('toc-other-centers')).toBe(true);
    });

    it('marks the flat pre-2026 dropdown required', async () => {
      is2026.set(false);
      await repaint();

      expect(isRequired('cp-field-contributing_center~flat')).toBe(true);
    });
  });

  // ⚠️ Two code paths render this dropdown; a rule added to only one silently misses the other.
  it('emits the same marker on the flat pre-2026 path, without the ToC condition', async () => {
    is2026.set(false);
    rdPartnersSE.tocReferenceCenterInstitutionIds.set([11, 22]);
    rdPartnersSE.partnersBody.contributing_center = [];
    await repaint();

    expect(fixture.nativeElement.querySelector('[data-testid="cp-field-contributing_center~flat"]')).toBeTruthy();
    expect(markerFieldEl()).toBeTruthy();
    expect(scan().labels).toContain(PLAIN_LABEL);

    rdPartnersSE.partnersBody.contributing_center = [CATALOG[0]] as any;
    await repaint();
    expect(markerFieldEl().classList.contains('complete')).toBe(true);
    expect(scan().labels).not.toContain(PLAIN_LABEL);
  });
});
