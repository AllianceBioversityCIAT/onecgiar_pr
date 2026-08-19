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

  /** The "Other(s)" multi-select — the one that auto-activates when the ToC brought no reference centers. */
  const otherCentersSelectEl = () =>
    fixture.nativeElement.querySelector('app-pr-multi-select[label="Other(s) Contributing CGIAR Centers"]');
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
