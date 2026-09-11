import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RdPartnersComponent } from './rd-partners.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SyncButtonComponent } from '../../../../../../custom-fields/sync-button/sync-button.component';
import { SaveButtonComponent } from '../../../../../../custom-fields/save-button/save-button.component';
import { NormalSelectorComponent } from './components/normal-selector/normal-selector.component';
import { DetailSectionTitleComponent } from '../../../../../../custom-fields/detail-section-title/detail-section-title.component';
import { CountInstitutionsTypesPipe } from '../rd-general-information/pipes/count-institutions-types.pipe';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { PrMultiSelectComponent } from '../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { AlertStatusComponent } from '../../../../../../custom-fields/alert-status/alert-status.component';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { RdPartnersService } from './rd-partners.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';

describe('RdPartnersComponent', () => {
  let component: RdPartnersComponent;
  let fixture: ComponentFixture<RdPartnersComponent>;
  let mockApiService: any;
  let mockRdPartnersService: any;
  let mockCustomizedAlertsFeService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        currentResultSectionName: signal<string>('Partners'),
        findClassTenSeconds: jest.fn(() => Promise.resolve())
      },
      resultsSE: {
        GET_allInstitutions: () => of({ response: [] }),
        GET_allInstitutionTypes: () => of({ response: [] }),
        GET_allChildlessInstitutionTypes: () => of({ response: [] }),
        GET_partnersSection: () => of({ response: [] }),
        GET_centers: () => of({ response: [] }),
        PATCH_resyncKnowledgeProducts: () => of({ response: [] }),
        PATCH_partnersSection: () => of({ response: [] }),
        GET_AllCLARISACenters: () => of({ response: [] })
      }
    };

    mockRdPartnersService = {
      getSectionInformation: jest.fn(),
      getCenterInformation: jest.fn(),
      // Raised by the component on entry (root-singleton service) to drive [appSectionSkeleton].
      sectionLoading: signal(true),
      partnersBody: {
        no_applicable_partner: true,
        institutions: [],
        contributing_np_projects: [] as any[],
        contributing_center: []
      }
    };

    mockCustomizedAlertsFeService = {
      show: jest.fn().mockImplementationOnce((config, callback) => {
        callback();
      })
    };

    await TestBed.configureTestingModule({
      declarations: [
        RdPartnersComponent,
        SyncButtonComponent,
        SaveButtonComponent,
        NormalSelectorComponent,
        DetailSectionTitleComponent,
        CountInstitutionsTypesPipe,
        PrFieldHeaderComponent,
        PrMultiSelectComponent,
        AlertStatusComponent
      ],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: RdPartnersService,
          useValue: mockRdPartnersService
        },
        {
          provide: CustomizedAlertsFeService,
          useValue: mockCustomizedAlertsFeService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RdPartnersComponent);
    component = fixture.componentInstance;
  });

  describe('ngOnInit()', () => {
    it('should initialize partnersBody and call getSectionInformation on ngOnInit', () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(
        `
        <div class="alert-event"></div>`,
        'text/html'
      );
      jest.spyOn(document, 'querySelectorAll').mockImplementation(selector => dom.querySelectorAll(selector));
      const spy = jest.spyOn(component.rdPartnersSE, 'getSectionInformation');

      component.ngOnInit();

      expect(spy).toHaveBeenCalled();
    });

    it('should set showPartnersRequest to true when alert-event is clicked', async () => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(`<div class="alert-event"></div>`, 'text/html');
      const querySelector = jest.spyOn(document, 'querySelectorAll').mockImplementation(selector => dom.querySelectorAll(selector));
      await component.ngOnInit();

      const alertEventElement = dom.querySelector('.alert-event');
      alertEventElement.dispatchEvent(new Event('click'));

      expect(component.api.dataControlSE.showPartnersRequest).toBe(true);

      querySelector.mockRestore();
    });

    it('should log an error if an exception occurs', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const querySelector = jest.spyOn(document, 'querySelectorAll').mockImplementation(() => {
        throw new Error('Test error');
      });

      await component.ngOnInit();

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));

      querySelector.mockRestore();
    });
  });

  describe('onSyncSection()', () => {
    it('should call PATCH_resyncKnowledgeProducts and getSectionInformation on onSyncSection', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_resyncKnowledgeProducts');
      const spyGetSectionInformation = jest.spyOn(mockRdPartnersService, 'getSectionInformation');

      component.onSyncSection();

      expect(spy).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });

  describe('validateGranTitle()', () => {
    it('should return false when no duplicate grant titles', () => {
      component.rdPartnersSE.partnersBody.contributing_np_projects = [
        {
          grant_title: 'Grant A',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        },
        {
          grant_title: 'Grant B',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        }
      ];

      expect(component.validateGranTitle).toBeFalsy();
    });
    it('should return true when there are duplicate grant titles', () => {
      component.rdPartnersSE.partnersBody.contributing_np_projects = [
        {
          grant_title: 'Grant A',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        },
        {
          grant_title: 'Grant A',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        }
      ];

      expect(component.validateGranTitle).toBeTruthy();
    });
  });

  describe('addBilateralContribution()', () => {
    it('should add a new donor interface to contributing_np_projects', () => {
      component.rdPartnersSE.partnersBody.contributing_np_projects = [];
      const initialLength = component.rdPartnersSE.partnersBody.contributing_np_projects.length;

      component.addBilateralContribution();

      expect(component.rdPartnersSE.partnersBody.contributing_np_projects.length).toBe(initialLength + 1);
    });
  });

  describe('deleteContributingCenter()', () => {
    beforeEach(() => {
      component.rdPartnersSE.partnersBody = {
        contributing_center: [
          { code: 'center1', primary: false },
          { code: 'center2', primary: false }
        ]
      } as any;
    });

    it('should delete the contributing center at the specified index', async () => {
      component.deleteContributingCenter(1);

      expect(component.rdPartnersSE.partnersBody.contributing_center.length).toBe(1);
    });

    it('should set updatingLeadData to true and then false after timeout when updateComponent is true', done => {
      jest.useFakeTimers();
      component.rdPartnersSE.updatingLeadData = false;

      component.deleteContributingCenter(1, true);

      expect(component.rdPartnersSE.updatingLeadData).toBe(true);

      jest.advanceTimersByTime(50);

      setTimeout(() => {
        expect(component.rdPartnersSE.updatingLeadData).toBe(false);
        done();
      }, 50);

      jest.runAllTimers();
      jest.useRealTimers();
    });
  });

  describe('deleteEvidence()', () => {
    it('should delete the evidence at the specified index', () => {
      component.rdPartnersSE.partnersBody.contributing_np_projects = [
        {
          grant_title: 'Grant A',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        },
        {
          grant_title: 'Grant B',
          funder: 1,
          center_grant_id: '',
          lead_center: ''
        }
      ];
      component.deleteEvidence(0);

      expect(component.rdPartnersSE.partnersBody.contributing_np_projects.length).toBe(1);
    });
  });

  describe('getMessageLead()', () => {
    it('should change the message depending on is_lead_by_partner flag', () => {
      component.rdPartnersSE.partnersBody.is_lead_by_partner = true;

      let message = component.getMessageLead();
      expect(message).toContain('partner');

      component.rdPartnersSE.partnersBody.is_lead_by_partner = false;

      message = component.getMessageLead();
      expect(message).toContain('CG Center');
    });
  });

  describe('onSaveSection()', () => {
    it('should clear institutions if no_applicable_partner is true', () => {
      component.rdPartnersSE.partnersBody.no_applicable_partner = true;
      component.rdPartnersSE.partnersBody.institutions = [{}, {}] as any[];

      component.onSaveSection();

      expect(component.rdPartnersSE.partnersBody.institutions).toEqual([]);
    });

    it('should set is_leading_result correctly when is_lead_by_partner is true', () => {
      component.rdPartnersSE = {
        leadPartnerId: 1,
        partnersBody: {
          is_lead_by_partner: true,
          mqap_institutions: [
            { institutions_id: 1, is_leading_result: false },
            { institutions_id: 2, is_leading_result: false }
          ] as any[],
          institutions: [
            { institutions_id: 3, is_leading_result: false },
            { institutions_id: 4, is_leading_result: false }
          ] as any[],
          contributing_center: [{ is_leading_result: true }] as any[]
        } as any
      } as any;

      component.onSaveSection();

      expect(component.rdPartnersSE.partnersBody.mqap_institutions[0].is_leading_result).toBe(true);
      expect(component.rdPartnersSE.partnersBody.mqap_institutions[1].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.institutions[0].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.institutions[1].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.contributing_center[0].is_leading_result).toBe(false);
    });

    it('should set is_leading_result correctly when is_lead_by_partner is false', () => {
      component.rdPartnersSE = {
        leadCenterCode: 'center1',
        partnersBody: {
          is_lead_by_partner: false,
          contributing_center: [
            { code: 'center1', is_leading_result: false },
            { code: 'center2', is_leading_result: false }
          ] as any[],
          mqap_institutions: [{ is_leading_result: true }] as any[],
          institutions: [{ is_leading_result: true }] as any[]
        } as any
      } as any;

      component.onSaveSection();

      expect(component.rdPartnersSE.partnersBody.contributing_center[0].is_leading_result).toBe(true);
      expect(component.rdPartnersSE.partnersBody.contributing_center[1].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.mqap_institutions[0].is_leading_result).toBe(false);
      expect(component.rdPartnersSE.partnersBody.institutions[0].is_leading_result).toBe(false);
    });

    it('should call PATCH_partnersSection and getSectionInformation', () => {
      const spyPatch = jest.spyOn(mockApiService.resultsSE, 'PATCH_partnersSection');
      const spyGetSectionInformation = jest.spyOn(mockRdPartnersService, 'getSectionInformation');

      component.onSaveSection();

      expect(spyPatch).toHaveBeenCalled();
      expect(spyGetSectionInformation).toHaveBeenCalled();
    });
  });
});

/**
 * `UCA-T-9` — `CanComponentDeactivate` wiring for `RdPartnersComponent` (P22). Same shape as
 * `rd-general-information.component.spec.ts`'s `CanComponentDeactivate (UCA-T-6)` describe.
 *
 * `SectionDirtyTrackerService` is component-scoped (`providers: [SectionDirtyTrackerService]`), so
 * each spec gets a fresh instance via `TestBed.createComponent`.
 *
 * Renders through the REAL `RdPartnersService` (not the file-level mock above) — the dirty-diff
 * snapshot target, `partnersBody`, lives on the service, not the component, so a mocked service
 * cannot exercise the real load/save timing. `GET_partnersSection` / `PATCH_partnersSection` are
 * mocked with a genuine async boundary (`delay(0)`, driven with `fakeAsync`/`tick`) instead of a
 * synchronous `of(...)` — matching `UCA-T-6`'s rework lesson: a synchronous mock would collapse the
 * real production race and pass even against an implementation that snapshots too early.
 */
describe('RdPartnersComponent — CanComponentDeactivate (UCA-T-9)', () => {
  let fixture: ComponentFixture<RdPartnersComponent>;
  let component: RdPartnersComponent;
  let rdPartnersSE: RdPartnersService;
  let apiMock: any;

  /** Local, test-scoped literal — never shared with the mocked-service tests above. */
  const loadResponse = () => ({
    no_applicable_partner: false,
    institutions: [],
    mqap_institutions: [],
    contributing_center: [],
    contributing_np_projects: [],
    is_lead_by_partner: false
  });

  beforeEach(async () => {
    apiMock = {
      dataControlSE: {
        currentResultSectionName: signal(''),
        findClassTenSeconds: jest.fn().mockResolvedValue(true),
        showPartnersRequest: false
      },
      resultsSE: {
        GET_partnersSection: jest.fn(() => of({ response: loadResponse() }).pipe(delay(0))),
        PATCH_partnersSection: jest.fn(() => of({ response: {} }).pipe(delay(0)))
      }
    };

    await TestBed.configureTestingModule({
      declarations: [RdPartnersComponent],
      imports: [HttpClientTestingModule, FormsModule],
      providers: [
        RdPartnersService,
        { provide: ApiService, useValue: apiMock },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        {
          provide: InstitutionsService,
          useValue: { loadedInstitutions: new BehaviorSubject<boolean>(false), institutionsList: [], institutionsWithoutCentersList: [] }
        },
        { provide: CentersService, useValue: { loadedCenters: new BehaviorSubject<boolean>(false), centersList: [] } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      // Empty template: these cases exercise the load/save timing contract, not the DOM.
      .overrideComponent(RdPartnersComponent, { set: { template: '' } })
      .compileComponents();

    rdPartnersSE = TestBed.inject(RdPartnersService);
    fixture = TestBed.createComponent(RdPartnersComponent);
    component = fixture.componentInstance;
  });

  it('is false right after the load flow genuinely completes', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.hasUnsavedChanges()).toBe(false);
  }));

  /**
   * Falsifying input: snapshotting `partnersBody` only once (at load) and never again after save
   * would make this true right after load-then-edit, which is correct here — but combined with the
   * next test would prove the save-branch snapshot never actually reset the baseline.
   */
  it('is true after editing a bound field', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    rdPartnersSE.partnersBody.no_applicable_partner = true;

    expect(component.hasUnsavedChanges()).toBe(true);
  }));

  /**
   * Falsifying input: snapshotting `partnersBody` only once (at load) and never again after a
   * successful save would report `true` here. The follow-up reload that `performSave()`'s `tap`
   * triggers is forced to FAIL entirely, so this test can only pass because of the DIRECT
   * `dirtyTracker.snapshot(...)` inside `performSave()`'s `tap` — not the (here failing) reload.
   */
  it('is false right when saveSection() emits true, even when the follow-up reload fails entirely', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    rdPartnersSE.partnersBody.no_applicable_partner = true;
    expect(component.hasUnsavedChanges()).toBe(true);

    apiMock.resultsSE.GET_partnersSection.mockReturnValue(throwError(() => new Error('reload failed')));

    let sawTrue = false;
    component.saveSection().subscribe(result => {
      sawTrue = result === true;
      expect(component.hasUnsavedChanges()).toBe(false);
    });
    tick();

    expect(sawTrue).toBe(true);
  }));

  /**
   * `UCA-T-9` rework, Discovered Issue 2 regression test. Falsifying input: a `hasUnsavedChanges()`
   * that only diffs `partnersBody` (attempt 1's bug) would report `false` here even though the user
   * genuinely picked a Lead Center — Next would then silently navigate away without saving it.
   */
  it('is true after editing ONLY leadCenterCode, with partnersBody left byte-identical', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    rdPartnersSE.leadCenterCode = 'a-brand-new-lead-center-code';

    expect(component.hasUnsavedChanges()).toBe(true);
  }));

  /** Same regression, for the Lead Partner field. */
  it('is true after editing ONLY leadPartnerId, with partnersBody left byte-identical', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    rdPartnersSE.leadPartnerId = 4242;

    expect(component.hasUnsavedChanges()).toBe(true);
  }));

  /**
   * Falsifying input: letting the underlying HTTP error propagate as an unhandled observable error
   * (instead of resolving `false`) would break `UnsavedChangesGuard`'s `switchMap`/subscribe chain
   * rather than cleanly blocking navigation.
   */
  it('saveSection() resolves false (not throws) on a failing PATCH_partnersSection, without reloading the section', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const reloadSpy = jest.spyOn(rdPartnersSE, 'getSectionInformation');
    apiMock.resultsSE.PATCH_partnersSection.mockReturnValue(throwError(() => new Error('save failed')));

    let result: boolean | undefined;
    let errored = false;
    component.saveSection().subscribe({
      next: value => (result = value),
      error: () => (errored = true)
    });
    tick();

    expect(errored).toBe(false);
    expect(result).toBe(false);
    expect(reloadSpy).not.toHaveBeenCalled();
  }));

  /**
   * `UCA-T-9` rework attempt 3, Issue 1 regression test — same fix as the P25 twin
   * (`rd-contributors-and-partners.component.spec.ts`). Simulates the genuine cold-entry race: the
   * CLARISA institutions/centers catalogues are STILL LOADING when `GET_partnersSection` resolves
   * (this rig's mocks start with empty lists and `loadedInstitutions`/`loadedCenters` at `false`,
   * exactly like a hard reload straight onto this section), so the synchronous auto-assign inside the
   * load flow cannot resolve `leadPartnerId`/`leadCenterCode` even though the loaded body carries a
   * persisted leading partner/center. The catalogues then emit `loaded: true` AFTER the section's own
   * load-flow snapshot already ran.
   *
   * Falsifying input: without `reconcileLeadFieldsAfterLateCatalogue()`, this test fails —
   * `hasUnsavedChanges()` stays `true` after the late catalogue emission settles. Self-verified:
   * commenting out the `this.onCatalogueDrivenLeadUpdate?.()` calls in `rd-partners.service.ts` (or
   * reverting `reconcileLeadFieldsAfterLateCatalogue()` to a no-op) makes this test fail with
   * `hasUnsavedChanges()` returning `true`; reapplying makes it pass.
   */
  it('stays clean after a late CLARISA catalogue emission resolves a persisted leading partner/center AFTER load (cold-entry race)', fakeAsync(() => {
    const institutionsMock: any = TestBed.inject(InstitutionsService);
    const centersMock: any = TestBed.inject(CentersService);

    apiMock.resultsSE.GET_partnersSection.mockReturnValue(
      of({
        response: {
          ...loadResponse(),
          institutions: [{ institutions_id: 77, is_leading_result: true, obj_institutions: {} }],
          // TWO contributing centers: `RdPartnersService` has no single-center auto-assign at all
          // (unlike its P25 twin), so this shape isn't load-bearing here the way it is in the twin's
          // test — kept for parity/readability and to exercise `setPossibleLeadCenters`'s real filter.
          contributing_center: [
            { code: 'C-77', is_leading_result: true },
            { code: 'C-88', is_leading_result: false }
          ]
        }
      }).pipe(delay(0))
    );

    fixture.detectChanges();
    tick();

    expect(component.hasUnsavedChanges()).toBe(false);

    institutionsMock.institutionsList = [{ institutions_id: 77 }];
    institutionsMock.institutionsWithoutCentersList = [{ institutions_id: 77 }];
    institutionsMock.loadedInstitutions.next(true);
    centersMock.centersList = [{ code: 'C-77' }, { code: 'C-88' }];
    centersMock.loadedCenters.next(true);
    tick();

    expect(rdPartnersSE.leadPartnerId).toBe(77);
    expect(rdPartnersSE.leadCenterCode).toBe('C-77');
    expect(component.hasUnsavedChanges()).toBe(false);
  }));

  /** Companion falsifying-input test: a genuine concurrent edit must still be reported dirty. */
  it('a genuine edit made before the late catalogue settles is still reported dirty afterward', fakeAsync(() => {
    const institutionsMock: any = TestBed.inject(InstitutionsService);

    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    rdPartnersSE.partnersBody.no_applicable_partner = true;
    expect(component.hasUnsavedChanges()).toBe(true);

    institutionsMock.institutionsList = [{ institutions_id: 77 }];
    institutionsMock.institutionsWithoutCentersList = [{ institutions_id: 77 }];
    institutionsMock.loadedInstitutions.next(true);
    tick();

    expect(component.hasUnsavedChanges()).toBe(true);
  }));

  /**
   * `UCA-T-9` rework attempt 4 regression test (the missing companion test the Reviewer's HALT
   * flagged). Attempt 3's `reconcileLeadFieldsAfterLateCatalogue()` substituted BOTH `leadCenterCode`
   * AND `leadPartnerId` back to the stored baseline whenever EITHER catalogue emitted, regardless of
   * which one actually could have changed. So editing ONLY `leadCenterCode` (a field the
   * `institutions` catalogue never touches) and then letting `institutions` emit late would silently
   * fold the edit away and report clean — real, silent data loss on a mandatory field.
   *
   * Falsifying input: this test FAILS against attempt-3 code (`hasUnsavedChanges()` wrongly flips to
   * `false` once `loadedInstitutions` emits) and PASSES once the substitution is scoped by `source` so
   * only `leadPartnerId` is folded back for an `institutions` emission.
   */
  it('a genuine edit to leadCenterCode survives a late emission from the OTHER catalogue (institutions)', fakeAsync(() => {
    const institutionsMock: any = TestBed.inject(InstitutionsService);

    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    rdPartnersSE.leadCenterCode = 'C-88';
    expect(component.hasUnsavedChanges()).toBe(true);

    // The OTHER catalogue — `institutions` only ever recomputes `leadPartnerId`, never `leadCenterCode`.
    institutionsMock.institutionsList = [];
    institutionsMock.institutionsWithoutCentersList = [];
    institutionsMock.loadedInstitutions.next(true);
    tick();

    expect(component.hasUnsavedChanges()).toBe(true);
  }));

  /** Symmetric case: a genuine edit to `leadPartnerId` must survive a late `centers` emission. */
  it('a genuine edit to leadPartnerId survives a late emission from the OTHER catalogue (centers)', fakeAsync(() => {
    const centersMock: any = TestBed.inject(CentersService);

    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    rdPartnersSE.leadPartnerId = 4242;
    expect(component.hasUnsavedChanges()).toBe(true);

    // The OTHER catalogue — `centers` only ever recomputes `leadCenterCode`, never `leadPartnerId`.
    centersMock.centersList = [];
    centersMock.loadedCenters.next(true);
    tick();

    expect(component.hasUnsavedChanges()).toBe(true);
  }));
});
