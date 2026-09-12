import { ComponentFixture, TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { RdContributorsAndPartnersService } from './rd-contributors-and-partners.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { InnovationUseResultsService } from '../../../../../../shared/services/global/innovation-use-results.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ContributorsAndPartnersBody } from './models/contributorsAndPartnersBody';
import { NonPooledProjectDto } from '../rd-partners/models/partnersBody';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { CustomFieldsModule } from '../../../../../../custom-fields/custom-fields.module';

describe('RdContributorsAndPartnersComponent', () => {
  let component: RdContributorsAndPartnersComponent;
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let mockApiService: any;
  let mockRdPartnersSE: any;
  let mockCustomizedAlertsFeSE: any;
  let mockInnovationUseResultsSE: any;
  let mockChangeDetectorRef: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        currentResult: {
          result_code: 'R-123',
          version_id: 1,
          portfolio: 'P25'
        },
        currentResultSectionName: signal(''),
        findClassTenSeconds: jest.fn().mockResolvedValue(true),
        showPartnersRequest: false
      },
      resultsSE: {
        GET_resultById: jest.fn().mockReturnValue(
          of({
            response: {
              result_code: 'R-123',
              version_id: 1,
              portfolio: 'P25'
            }
          })
        ),
        GET_generalInformationByResultId: jest.fn().mockReturnValue(of({ response: {} })),
        GET_AllWithoutResults: jest.fn().mockReturnValue(
          of({
            response: [
              { id: 1, name: 'Initiative 1' },
              { id: 2, name: 'Initiative 2' }
            ]
          })
        ),
        // GET_AllInitiatives is called unconditionally by ngOnInit right after GET_AllWithoutResults
        // (P2-2929 Science Programs list) — without a mock it throws inside the subscribe's `next`, and
        // that throw surfaces asynchronously (RxJS reports it via a deferred task), occasionally
        // attributing an unrelated failure to whichever test/task happens to be running when it lands.
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        PATCH_ContributorsPartners: jest.fn().mockReturnValue(of({})),
        PATCH_resyncKnowledgeProducts: jest.fn().mockReturnValue(of({}))
      }
    };

    mockRdPartnersSE = {
      partnersBody: new ContributorsAndPartnersBody(),
      getSectionInformation: jest.fn(),
      loadFilteredBilateralProjects: jest.fn(),
      loadClarisaProjects: jest.fn(),
      resetState: jest.fn(),
      setPossibleLeadCenters: jest.fn(),
      contributingInitiativeNew: [],
      leadPartnerId: null,
      leadCenterCode: null,
      updatingLeadData: false,
      otherCentersSelected: [],
      // Defaults to "no ToC-planned Centers" so pre-existing deleteContributingCenter/deleteOtherCenter
      // tests that don't set up ToC data keep exercising unrestricted deletion (TOC-C-T-1 guard).
      tocReferenceCenterInstitutionIds: signal<number[]>([])
    };

    mockCustomizedAlertsFeSE = {
      show: jest.fn()
    };

    mockInnovationUseResultsSE = {
      resultsList: []
    };

    mockChangeDetectorRef = {
      detectChanges: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [HttpClientTestingModule, FormsModule, TermPipe, CustomFieldsModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: RdContributorsAndPartnersService, useValue: mockRdPartnersSE },
        { provide: CustomizedAlertsFeService, useValue: mockCustomizedAlertsFeSE },
        { provide: InnovationUseResultsService, useValue: mockInnovationUseResultsSE },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef },
        { provide: InstitutionsService, useValue: {} },
        { provide: RolesService, useValue: {} },
        { provide: CentersService, useValue: { centers: signal([]), getData: jest.fn().mockResolvedValue([]) } },
        { provide: ResultLevelService, useValue: {} },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => false, isLeadContactPersonMandatory2026: () => false, fields: () => ({}), isP25: () => false } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values', () => {
    expect(component.alertStatusMessage).toBeDefined();
    expect(component.disabledText).toBe('To remove this center, please contact your librarian');
  });

  it('should set currentResultSectionName on construction', () => {
    expect(mockApiService.dataControlSE.currentResultSectionName()).toBe('Partners & Contributors');
  });

  describe('ngOnInit', () => {
    it('should initialize partnersBody and call service methods', () => {
      component.ngOnInit();
      expect(mockRdPartnersSE.partnersBody).toBeInstanceOf(ContributorsAndPartnersBody);
      expect(mockRdPartnersSE.getSectionInformation).toHaveBeenCalled();
    });

    it('should call GET_AllWithoutResults', () => {
      component.ngOnInit();
      expect(mockApiService.resultsSE.GET_resultById).toHaveBeenCalled();
    });

    it('should set contributingInitiativesList from API response', () => {
      component.ngOnInit();
      expect(component.contributingInitiativesList.length).toBeGreaterThan(0);
    });

    it('should handle error in GET_AllWithoutResults', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockApiService.resultsSE.GET_resultById.mockReturnValue(throwError(() => new Error('API Error')));
      component.ngOnInit();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('onSyncSection', () => {
    it('should show confirmation alert and sync on confirm', () => {
      component.onSyncSection();
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalled();
      const alertConfig = mockCustomizedAlertsFeSE.show.mock.calls[0][0];
      expect(alertConfig.title).toBe('Sync confirmation');
      expect(alertConfig.status).toBe('warning');
    });

    it('should call PATCH_resyncKnowledgeProducts on confirm', () => {
      component.onSyncSection();
      const confirmCallback = mockCustomizedAlertsFeSE.show.mock.calls[0][1];
      confirmCallback();
      expect(mockApiService.resultsSE.PATCH_resyncKnowledgeProducts).toHaveBeenCalled();
      expect(mockRdPartnersSE.getSectionInformation).toHaveBeenCalled();
    });
  });

  describe('deleteEvidence', () => {
    it('should remove evidence at given index', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [new NonPooledProjectDto(), new NonPooledProjectDto(), new NonPooledProjectDto()];
      const initialLength = mockRdPartnersSE.partnersBody.contributing_np_projects.length;
      component.deleteEvidence(1);
      expect(mockRdPartnersSE.partnersBody.contributing_np_projects.length).toBe(initialLength - 1);
    });
  });

  describe('addBilateralContribution', () => {
    it('should add new NonPooledProjectDto to contributing_np_projects', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [];
      component.addBilateralContribution();
      expect(mockRdPartnersSE.partnersBody.contributing_np_projects.length).toBe(1);
      expect(mockRdPartnersSE.partnersBody.contributing_np_projects[0]).toBeInstanceOf(NonPooledProjectDto);
    });
  });

  describe('deleteContributingCenter', () => {
    it('should remove center at given index', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [
        { code: 'C1', name: 'Center 1' },
        { code: 'C2', name: 'Center 2' }
      ];
      const initialLength = mockRdPartnersSE.partnersBody.contributing_center.length;
      component.deleteContributingCenter(0, false);
      expect(mockRdPartnersSE.partnersBody.contributing_center.length).toBe(initialLength - 1);
    });

    it('should set updatingLeadData when updateComponent is true', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }];
      component.deleteContributingCenter(0, true);
      expect(mockRdPartnersSE.updatingLeadData).toBe(true);
    });

    it('should clear leadCenterCode if deleted center was the lead', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }];
      mockRdPartnersSE.leadCenterCode = 'C1';
      component.deleteContributingCenter(0, false);
      expect(mockRdPartnersSE.leadCenterCode).toBeNull();
    });
  });

  /**
   * LC-T-4 (docs/specs/bugfix/lead-center-full-catalog, LC-DD-4): a manual delete of the "Other(s)" chip
   * must clear `autoAddedLeadCenterCode` when the removed entry was the one `onLeadCenterSelected`
   * auto-added — otherwise a stale reference could mis-fire the swap logic against a center that no
   * longer exists.
   */
  describe('deleteOtherCenter', () => {
    beforeEach(() => {
      mockRdPartnersSE.otherCentersSelected = [{ code: 'C1', name: 'Center One' }];
      mockRdPartnersSE.autoAddedLeadCenterCode = 'C1';
    });

    it('clears autoAddedLeadCenterCode when the removed "Other" center is the one that was auto-added', () => {
      component.deleteOtherCenter(0);
      expect(mockRdPartnersSE.autoAddedLeadCenterCode).toBeNull();
    });

    it('leaves autoAddedLeadCenterCode untouched when the removed "Other" center is a different one', () => {
      mockRdPartnersSE.otherCentersSelected = [
        { code: 'C1', name: 'Center One' },
        { code: 'C2', name: 'Center Two' }
      ];
      mockRdPartnersSE.autoAddedLeadCenterCode = 'C1';

      component.deleteOtherCenter(1); // removes C2, not the auto-added C1

      expect(mockRdPartnersSE.autoAddedLeadCenterCode).toBe('C1');
    });

    it('still recomputes lead-center eligibility after the delete', () => {
      component.deleteOtherCenter(0);
      expect(mockRdPartnersSE.setPossibleLeadCenters).toHaveBeenCalledWith(true);
    });
  });

  /**
   * The "Other(s)" dropdown is the ONLY way to add a center when the ToC brought none (P2-2998 AC4).
   * Without this wiring the required "Lead center" select stayed empty until a Save draft reloaded the section.
   */
  describe('onOtherCenterSelect', () => {
    it('recomputes the lead-center options as soon as an "Other(s)" center is picked', () => {
      component.onOtherCenterSelect({});
      expect(mockRdPartnersSE.setPossibleLeadCenters).toHaveBeenCalledWith(true);
    });

    it('offers a useful hint for the legitimate empty state instead of a bare "no items available"', () => {
      // Asserts the INTENT, not the copy: the empty state must point at the contributing-center
      // step instead of the bare "no items available". Tying this to an exact sentence made the
      // suite fail on a wording change that was itself fine (merge of 2026-08-27).
      expect(component.noLeadCentersNote).toBeTruthy();
      expect(component.noLeadCentersNote.toLowerCase()).toContain('contributing center');
      expect(component.noLeadCentersNote.toLowerCase()).toContain('lead center');
    });
  });

  /**
   * TOC-SP-T-1 (docs/specs/changes/toc-science-program-guard): block removing the last real
   * Contributing Science Program (combined across `scienceSelected` minus the `OTHER_SP_CODE`
   * sentinel, and `otherScienceSelected`) while the result's ToC has planned Science Programs.
   */
  describe('TOC-SP-T-1 — minimum Science Program guard', () => {
    const SP01 = { id: 1, official_code: 'SP01' };
    const SP02 = { id: 2, official_code: 'SP02' };
    const SP03 = { id: 3, official_code: 'SP03' };
    const OTHER_SP = { id: 101, official_code: 'OTHER01' };

    beforeEach(() => {
      mockRdPartnersSE.partnersBody.result_toc_result = { planned_result: true };
      mockRdPartnersSE.scienceSelected = [];
      mockRdPartnersSE.otherScienceSelected = [];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds = signal<number[]>([]);
    });

    it('TOC-SP-AC-1: deletes down to 1 remaining across two sequential deletes, no alert', () => {
      mockRdPartnersSE.scienceSelected = [SP01, SP02, SP03];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([1, 2, 3]);

      component.deleteScience(1); // removes SP02
      expect(mockRdPartnersSE.scienceSelected.map((sp: any) => sp.id)).toEqual([1, 3]);

      component.deleteScience(1); // removes SP03
      expect(mockRdPartnersSE.scienceSelected.map((sp: any) => sp.id)).toEqual([1]);

      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-SP-AC-2: blocks deleting the last remaining ToC-planned Science Program and shows the alert', () => {
      mockRdPartnersSE.scienceSelected = [SP01];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([1]);

      component.deleteScience(0);

      expect(mockRdPartnersSE.scienceSelected).toEqual([SP01]);
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledTimes(1);
      const alertConfig = mockCustomizedAlertsFeSE.show.mock.calls[0][0];
      expect(alertConfig.id).toBe('toc-science-program-min');
      expect(alertConfig.status).toBe('warning');
      expect(alertConfig.confirmText).toBeUndefined();
    });

    it('TOC-SP-AC-3: no ToC-planned Science Programs — deletes all chips unrestricted, guard never fires even at zero remaining', () => {
      mockRdPartnersSE.scienceSelected = [SP01];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([]); // no ToC-planned Science Programs

      component.deleteScience(0);

      expect(mockRdPartnersSE.scienceSelected).toEqual([]);
      // BUT the guard must NOT fire when hasTocPlannedScience is false, even at zero remaining chips.
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-SP-AC-3b: also unrestricted when planned_result === false, even with ToC reference ids present', () => {
      mockRdPartnersSE.partnersBody.result_toc_result = { planned_result: false };
      mockRdPartnersSE.scienceSelected = [SP01];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([1]);

      component.deleteScience(0);

      expect(mockRdPartnersSE.scienceSelected).toEqual([]);
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-SP-AC-4: deleting an Other entry never consults the guard — deleting the "Other" one leaves 1 (from ToC), no alert', () => {
      mockRdPartnersSE.scienceSelected = [SP01];
      mockRdPartnersSE.otherScienceSelected = [OTHER_SP];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([1]);

      component.deleteOtherScience(0);

      expect(mockRdPartnersSE.otherScienceSelected).toEqual([]);
      expect(mockRdPartnersSE.scienceSelected).toEqual([SP01]);
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-SP-AC-5 (TOC-SP-DD-4): 2 ToC-origin SPs + 1 Other SP — delete SP1 succeeds, delete SP2 (last ToC-origin) is blocked', () => {
      const SP02 = { id: 2, official_code: 'SP02', short_name: 'Science Program 2' };
      const SENTINEL = { id: component.OTHER_SP_CODE };
      // Sentinel present alongside the ToC-origin SPs — the split UI shape when Other(s) has entries.
      mockRdPartnersSE.scienceSelected = [SP01, SP02, SENTINEL];
      mockRdPartnersSE.otherScienceSelected = [OTHER_SP];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([1, 2]);

      // Delete SP1 (ToC-origin): succeeds, no alert.
      component.deleteScience(0);
      expect(mockRdPartnersSE.scienceSelected).toEqual([SP02, SENTINEL]);
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();

      // Delete SP2 (now index 0, the last remaining ToC-origin SP): blocked, even though an
      // "Other" SP is still selected — the old combined-count formula (1 ToC + 1 Other = 2,
      // 2-1=1>0) would have wrongly allowed this.
      component.deleteScience(0);
      expect(mockRdPartnersSE.scienceSelected).toEqual([SP02, SENTINEL]);
      expect(mockRdPartnersSE.otherScienceSelected).toEqual([OTHER_SP]);
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledTimes(1);
      const alertConfig = mockCustomizedAlertsFeSE.show.mock.calls[0][0];
      expect(alertConfig.id).toBe('toc-science-program-min');
    });

    it('TOC-SP-AC-6 (TOC-SP-DD-4): 0 ToC-origin edge state — deleting the Other SP always succeeds', () => {
      // scienceSelected holds only the sentinel (0 real ToC-origin entries); otherScienceSelected
      // holds one real "Other" SP. Under the old combined formula (0 ToC + 1 Other = 1, 1-1=0)
      // this would have been blocked; deleteOtherScience never consults the guard at all.
      mockRdPartnersSE.scienceSelected = [{ id: component.OTHER_SP_CODE }];
      mockRdPartnersSE.otherScienceSelected = [OTHER_SP];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([1]); // guard active

      component.deleteOtherScience(0);

      expect(mockRdPartnersSE.otherScienceSelected).toEqual([]);
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-SP-DD-3: deleting the OTHER_SP_CODE sentinel ALWAYS succeeds, even when its cascade would bring the real count to zero', () => {
      // scienceSelected holds only the "Other(s)" sentinel chip (no real ToC-origin SP); the one real
      // SP lives in otherScienceSelected, which the sentinel's deletion cascades to clear. Per
      // TOC-SP-DD-3 (supersedes TOC-SP-DD-2's cascade-blocking), the sentinel is a UI-shape control,
      // not itself a Contributing Science Program — its removal is never guarded, regardless of the
      // cascade's effect on the real count.
      mockRdPartnersSE.scienceSelected = [{ id: component.OTHER_SP_CODE }];
      mockRdPartnersSE.otherScienceSelected = [OTHER_SP];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([1]); // ToC guard active

      component.deleteScience(0);

      // The sentinel deletion succeeds unconditionally: no alert, scienceSelected loses the sentinel,
      // and the cascade (existing behavior) clears otherScienceSelected.
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
      expect(mockRdPartnersSE.scienceSelected).toEqual([]);
      expect(mockRdPartnersSE.otherScienceSelected).toEqual([]);
    });
  });

  /**
   * TOC-C-T-1 (docs/specs/changes/toc-center-guard): block removing the last real Contributing
   * CGIAR Center (combined across `contributing_center` minus the `OTHER_CENTERS_CODE` sentinel,
   * and `otherCentersSelected`) while the result's ToC has planned Centers. Mirrors TOC-SP-T-1's
   * guard shape exactly, substituting Centers-specific signals.
   */
  describe('TOC-C-T-1 — minimum Contributing CGIAR Center guard', () => {
    const C1 = { code: 'C1', name: 'Center 1' };
    const C2 = { code: 'C2', name: 'Center 2' };
    const C3 = { code: 'C3', name: 'Center 3' };
    const OTHER_C = { code: 'OC1', name: 'Other Center' };
    const OTHER_C2 = { code: 'OC2', name: 'Other Center 2' };

    beforeEach(() => {
      mockRdPartnersSE.partnersBody.result_toc_result = { planned_result: true };
      mockRdPartnersSE.partnersBody.contributing_center = [];
      mockRdPartnersSE.otherCentersSelected = [];
      mockRdPartnersSE.tocReferenceCenterInstitutionIds = signal<number[]>([]);
    });

    it('TOC-C-AC-1: deletes down to 1 remaining across two sequential deletes, no alert', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [C1, C2, C3];
      mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([1, 2, 3]);

      component.deleteContributingCenter(1); // removes C2
      expect(mockRdPartnersSE.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1', 'C3']);

      component.deleteContributingCenter(1); // removes C3
      expect(mockRdPartnersSE.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1']);

      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-C-AC-2: blocks deleting the last remaining ToC-planned Center and shows the alert', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [C1];
      mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([1]);

      component.deleteContributingCenter(0);

      expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([C1]);
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledTimes(1);
      const alertConfig = mockCustomizedAlertsFeSE.show.mock.calls[0][0];
      expect(alertConfig.id).toBe('toc-center-min');
      expect(alertConfig.status).toBe('warning');
      expect(alertConfig.confirmText).toBeUndefined();
    });

    it('TOC-C-AC-3: no ToC-planned Centers — deletes all chips unrestricted, guard never fires even at zero remaining', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [C1];
      mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([]); // no ToC-planned Centers

      component.deleteContributingCenter(0);

      expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([]);
      // BUT the guard must NOT fire when hasTocPlannedCenter is false, even at zero remaining chips.
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-C-AC-3b: also unrestricted when planned_result === false, even with ToC reference ids present', () => {
      mockRdPartnersSE.partnersBody.result_toc_result = { planned_result: false };
      mockRdPartnersSE.partnersBody.contributing_center = [C1];
      mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([1]);

      component.deleteContributingCenter(0);

      expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([]);
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-C-AC-4: deleting an Other entry never consults the guard — deleting the "Other" one leaves 1 (from ToC), no alert', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [C1];
      mockRdPartnersSE.otherCentersSelected = [OTHER_C];
      mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([1]);

      component.deleteOtherCenter(0);

      expect(mockRdPartnersSE.otherCentersSelected).toEqual([]);
      expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([C1]);
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-C-AC-7 (TOC-C-DD-5): 2 ToC-origin Centers + 1 Other Center — delete C1 succeeds, delete C2 (last ToC-origin) is blocked', () => {
      const SENTINEL = { code: component.OTHER_CENTERS_CODE };
      // Sentinel present alongside the ToC-origin Centers — the split UI shape when Other(s) has entries.
      mockRdPartnersSE.partnersBody.contributing_center = [C1, C2, SENTINEL];
      mockRdPartnersSE.otherCentersSelected = [OTHER_C];
      mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([1, 2]);

      // Delete C1 (ToC-origin): succeeds, no alert.
      component.deleteContributingCenter(0);
      expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([C2, SENTINEL]);
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();

      // Delete C2 (now index 0, the last remaining ToC-origin Center): blocked, even though an
      // "Other" Center is still selected — the old combined-count formula (1 ToC + 1 Other = 2,
      // 2-1=1>0) would have wrongly allowed this.
      component.deleteContributingCenter(0);
      expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([C2, SENTINEL]);
      expect(mockRdPartnersSE.otherCentersSelected).toEqual([OTHER_C]);
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledTimes(1);
      const alertConfig = mockCustomizedAlertsFeSE.show.mock.calls[0][0];
      expect(alertConfig.id).toBe('toc-center-min');
    });

    it('TOC-C-AC-8 (TOC-C-DD-5): 0 ToC-origin edge state — deleting the Other Center always succeeds', () => {
      // contributing_center holds only the sentinel (0 real ToC-origin entries); otherCentersSelected
      // holds one real "Other" Center. Under the old combined formula (0 ToC + 1 Other = 1, 1-1=0)
      // this would have been blocked; deleteOtherCenter never consults the guard at all.
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: component.OTHER_CENTERS_CODE }];
      mockRdPartnersSE.otherCentersSelected = [OTHER_C];
      mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([1]); // guard active

      component.deleteOtherCenter(0);

      expect(mockRdPartnersSE.otherCentersSelected).toEqual([]);
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('TOC-C-AC-5 (TOC-C-DD-4): deleting the OTHER_CENTERS_CODE sentinel ALWAYS succeeds, even when its cascade would bring the real count to zero', () => {
      // contributing_center holds only the "Other(s)" sentinel chip (no real ToC-origin Center); the
      // TWO real Centers live in otherCentersSelected, which the sentinel's deletion cascades to clear.
      // Per TOC-C-DD-4 (supersedes TOC-C-DD-3's cascade-blocking), the sentinel is a UI-shape control,
      // not itself a Contributing CGIAR Center — its removal is never guarded, regardless of the
      // cascade's effect on the real count.
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: component.OTHER_CENTERS_CODE }];
      mockRdPartnersSE.otherCentersSelected = [OTHER_C, OTHER_C2];
      mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([1]); // ToC guard active

      component.deleteContributingCenter(0);

      // The sentinel deletion succeeds unconditionally: no alert, contributing_center loses the
      // sentinel, and the cascade (existing behavior) clears otherCentersSelected.
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
      expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([]);
      expect(mockRdPartnersSE.otherCentersSelected).toEqual([]);
    });

    describe('TOC-C-AC-6 (flat/unmapped UI parity) — only contributing_center populated, no split', () => {
      it('allows deleting down to 1 remaining, no alert', () => {
        mockRdPartnersSE.partnersBody.contributing_center = [C1, C2];
        mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([1, 2]);

        component.deleteContributingCenter(1); // removes C2

        expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([C1]);
        expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
      });

      it('blocks deleting the last remaining Center', () => {
        mockRdPartnersSE.partnersBody.contributing_center = [C1];
        mockRdPartnersSE.tocReferenceCenterInstitutionIds.set([1]);

        component.deleteContributingCenter(0);

        expect(mockRdPartnersSE.partnersBody.contributing_center).toEqual([C1]);
        expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledTimes(1);
        const alertConfig = mockCustomizedAlertsFeSE.show.mock.calls[0][0];
        expect(alertConfig.id).toBe('toc-center-min');
      });
    });
  });

  describe('validateGranTitle', () => {
    it('should return true if duplicate grant titles exist', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [{ grant_title: 'Grant 1' }, { grant_title: 'Grant 1' }, { grant_title: 'Grant 2' }];
      expect(component.validateGranTitle).toBe(true);
    });

    it('should return true if any project has no grant_title', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [{ grant_title: 'Grant 1' }, { grant_title: '' }, { grant_title: 'Grant 2' }];
      expect(component.validateGranTitle).toBe(true);
    });

    it('should return false if all grant titles are unique and present', () => {
      mockRdPartnersSE.partnersBody.contributing_np_projects = [{ grant_title: 'Grant 1' }, { grant_title: 'Grant 2' }, { grant_title: 'Grant 3' }];
      expect(component.validateGranTitle).toBe(false);
    });
  });

  describe('onSaveSection', () => {
    beforeEach(() => {
      mockRdPartnersSE.partnersBody = {
        no_applicable_partner: false,
        is_lead_by_partner: false,
        contributing_center: [],
        institutions: [],
        mqap_institutions: [],
        result_toc_result: { planned_result: true, result_toc_results: [] },
        linked_results: [{ id: 1 }, { id: 2 }],
        contributing_initiatives: {
          pending_contributing_initiatives: []
        }
      };
    });

    it('should clear institutions if no_applicable_partner is true', () => {
      mockRdPartnersSE.partnersBody.no_applicable_partner = true;
      mockRdPartnersSE.partnersBody.institutions = [{ id: 1 }];
      component.onSaveSection();
      expect(mockRdPartnersSE.partnersBody.institutions).toEqual([]);
    });

    it('should set is_leading_result for centers when not lead by partner', () => {
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }, { code: 'C2' }];
      mockRdPartnersSE.leadCenterCode = 'C1';
      component.onSaveSection();
      expect(mockRdPartnersSE.partnersBody.contributing_center[0].is_leading_result).toBe(true);
      expect(mockRdPartnersSE.partnersBody.contributing_center[1].is_leading_result).toBe(false);
    });

    it('should set is_leading_result for partners when lead by partner', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = true;
      mockRdPartnersSE.partnersBody.institutions = [{ institutions_id: 1 }, { institutions_id: 2 }];
      mockRdPartnersSE.leadPartnerId = 1;
      component.onSaveSection();
      expect(mockRdPartnersSE.partnersBody.institutions[0].is_leading_result).toBe(true);
      expect(mockRdPartnersSE.partnersBody.institutions[1].is_leading_result).toBe(false);
    });

    it('should not clear result_toc_results if planned_result is false', () => {
      mockRdPartnersSE.partnersBody.result_toc_result.planned_result = false;
      mockRdPartnersSE.partnersBody.result_toc_result.result_toc_results = [{ id: 1 }];
      component.onSaveSection();
      expect(mockRdPartnersSE.partnersBody.result_toc_result.result_toc_results).toEqual([{ id: 1 }]);
    });

    it('should convert linked_results to array of numbers', () => {
      mockRdPartnersSE.partnersBody.linked_results = [{ id: 1 }, { id: 2 }, 3];
      component.onSaveSection();
      expect(mockApiService.resultsSE.PATCH_ContributorsPartners).toHaveBeenCalled();
      const callArgs = mockApiService.resultsSE.PATCH_ContributorsPartners.mock.calls[0][0];
      expect(callArgs.linked_results).toEqual([1, 2, 3]);
    });

    it('should include contributingInitiativeNew in pending_contributing_initiatives', () => {
      mockRdPartnersSE.contributingInitiativeNew = [{ id: 1, name: 'New Initiative' }];
      component.onSaveSection();
      const callArgs = mockApiService.resultsSE.PATCH_ContributorsPartners.mock.calls[0][0];
      expect(callArgs.contributing_initiatives.pending_contributing_initiatives).toContainEqual({ id: 1, name: 'New Initiative' });
    });

    /**
     * LCD-T-4 (docs/specs/changes/lead-center-decouple, LCD-DD-3): the single most important new
     * test in this task. `onSaveSection()` must stamp BOTH a leading center and a leading partner
     * in ONE call — the old `if (is_lead_by_partner) {...} else {...}` force-zeroed whichever side
     * lost the branch.
     *
     * LCD-AC-2 TOC-ORIGIN PROOF: the leading center here MUST reach the payload through the
     * `isCP2026` `tocCenters` array (component.ts's bare `{ ...c, from_toc: true }` spread), never
     * through `otherCentersSelected`/`otherCenters`. Per `design.md` §12 LCD-DD-3's corrected
     * table, `otherCenters` computes its own `is_leading_result` independently and would have
     * passed this assertion even BEFORE this spec's change — it proves nothing about the fix.
     * `tocCenters` inherits its flag from the unconditional stamping loop at the top of
     * `onSaveSection()`, which is exactly what `LCD-DD-3` rewrote. `otherCentersSelected` is left
     * empty below and the fixture's `contributing_center` rows are asserted to carry `from_toc:
     * true`, which only happens via the `tocCenters` spread — that assertion is the proof.
     */
    it('LCD-AC-2: stamps a ToC-origin leading center AND a leading partner in one call (LCD-R-4/R-5/R-6)', () => {
      (component as any).fieldsManagerSE = { isContributorsPartners2026: () => true , isLeadContactPersonMandatory2026: () => false, fields: () => ({})};
      mockRdPartnersSE.partnersBody.is_lead_by_partner = true;
      mockRdPartnersSE.leadCenterCode = 'C1';
      mockRdPartnersSE.leadPartnerId = 1;
      // ToC-origin centers: routed to the payload via the `tocCenters` bare spread, NOT
      // `otherCentersSelected` — load-bearing per LCD-DD-3's corrected table.
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }, { code: 'C2' }];
      mockRdPartnersSE.otherCentersSelected = [];
      mockRdPartnersSE.partnersBody.institutions = [{ institutions_id: 1 }, { institutions_id: 2 }];
      mockRdPartnersSE.otherPartnersSelected = [];
      mockRdPartnersSE.scienceSelected = [];
      mockRdPartnersSE.otherScienceSelected = [];
      mockRdPartnersSE.loadedAcceptedScienceIds = new Set<number>();
      mockRdPartnersSE.loadedPendingScience = [];
      mockRdPartnersSE.OTHER_PARTNERS_CODE = -999999;
      mockRdPartnersSE.partnersBody.contributing_initiatives = { pending_contributing_initiatives: [], accepted_contributing_initiatives: [] };

      component.onSaveSection();

      const callArgs = mockApiService.resultsSE.PATCH_ContributorsPartners.mock.calls[0][0];
      const leadingCenter = callArgs.contributing_center.find((c: any) => c.code === 'C1');
      const otherCenter = callArgs.contributing_center.find((c: any) => c.code === 'C2');
      const leadingPartner = callArgs.institutions.find((i: any) => i.institutions_id === 1);
      const otherPartner = callArgs.institutions.find((i: any) => i.institutions_id === 2);

      // Both leads present in the SAME payload — the whole point of LCD-R-6.
      expect(leadingCenter.is_leading_result).toBe(true);
      expect(leadingPartner.is_leading_result).toBe(true);
      // Proof this center traveled via `tocCenters`, not `otherCentersSelected`.
      expect(leadingCenter.from_toc).toBe(true);
      // Neither non-selected row is also marked leading.
      expect(otherCenter.is_leading_result).toBe(false);
      expect(otherPartner.is_leading_result).toBe(false);
    });

    /**
     * LCD-AC-3: the required-field scan blocks save with no Lead Center selected. `onSaveSection()`
     * itself never throws or refuses on a null `leadCenterCode` — the actual blocking mechanism is
     * the `.pr-field.mandatory`/`complete` DOM scan (src/CLAUDE.md §21.5), covered by the
     * render-level LCD-AC-1/AC-3 tests below. This assertion pins the payload-side half of the
     * contract: with no Lead Center, no `contributing_center` row is ever marked leading — so even
     * if a save slipped past the scan, it would not silently fabricate a lead.
     */
    it('LCD-AC-3 (save-side half): with no Lead Center selected, no contributing_center row is stamped leading', () => {
      mockRdPartnersSE.leadCenterCode = null;
      mockRdPartnersSE.partnersBody.contributing_center = [{ code: 'C1' }, { code: 'C2' }];

      component.onSaveSection();

      expect(mockRdPartnersSE.partnersBody.contributing_center.every((c: any) => c.is_leading_result === false)).toBe(true);
    });

    it('should call getSectionInformation after successful save', () => {
      component.onSaveSection();
      expect(mockApiService.resultsSE.PATCH_ContributorsPartners).toHaveBeenCalled();
      // `PATCH_ContributorsPartners` is mocked with `of({})`, which emits synchronously, so the
      // subscribe callback (and its `getSectionInformation(null, true)` call) already ran by the time
      // `onSaveSection()` returns above — no `setTimeout` needed. A fire-and-forget `setTimeout(..., 0)`
      // assertion here doesn't fail this test on a regression (Jest doesn't wait for it); worse, if it
      // ever throws, that throw surfaces as an uncaught exception attributed to whatever OTHER test
      // happens to be running when the timer fires.
      // `UCA-T-9` added a third `onLoaded` callback arg (dirty-tracker re-snapshot on reload) — the
      // first two positional args are still the ones this test cares about.
      expect(mockRdPartnersSE.getSectionInformation).toHaveBeenCalledWith(null, true, expect.any(Function));
    });
  });

  describe('onRemoveAcceptedContributing', () => {
    it('should remove from accepted_contributing_initiatives', () => {
      mockRdPartnersSE.partnersBody.contributing_initiatives = {
        accepted_contributing_initiatives: [{ id: 1 }, { id: 2 }]
      };
      component.onRemoveAcceptedContributing(0);
      expect(mockRdPartnersSE.partnersBody.contributing_initiatives.accepted_contributing_initiatives.length).toBe(1);
    });
  });

  describe('onRemoveNewContributing', () => {
    it('should remove from contributingInitiativeNew', () => {
      mockRdPartnersSE.contributingInitiativeNew = [{ id: 1 }, { id: 2 }];
      component.onRemoveNewContributing(0);
      expect(mockRdPartnersSE.contributingInitiativeNew.length).toBe(1);
    });
  });

  describe('toggleActiveContributor', () => {
    it('should toggle is_active property', () => {
      const item = { is_active: false };
      component.toggleActiveContributor(item);
      expect(item.is_active).toBe(true);
      component.toggleActiveContributor(item);
      expect(item.is_active).toBe(false);
    });
  });

  /**
   * LCD-T-4 (docs/specs/changes/lead-center-decouple): `getMessageLead()` was replaced by two
   * independent methods (`LCD-DD-4`) once Lead Center and Lead Partner stopped sharing a toggle
   * branch. Retargeted from the old `describe('getMessageLead', ...)`, which called a method that
   * no longer exists — these assert `LCD-R-7`/`LCD-AC-5` explicitly: the center message must NOT
   * claim the catalog is limited to "already added in this section" (stale since LC-DD-1 made
   * `possibleLeadCenters` the full CLARISA catalog); the partner message must still say so.
   */
  describe('getMessageLeadCenter / getMessageLeadPartner (LCD-R-7 / LCD-AC-5)', () => {
    it('getMessageLeadCenter never claims centers are limited to ones already added in this section', () => {
      const message = component.getMessageLeadCenter();
      expect(message.toLowerCase()).not.toContain('already added in this section');
      expect(message).toContain('CG Center');
    });

    it('getMessageLeadPartner still limits partners to ones already added in this section', () => {
      const message = component.getMessageLeadPartner();
      expect(message).toContain('partner');
      expect(message).toContain('Only partners already added in this section can be selected');
    });
  });

  describe('formatResultLabel', () => {
    it('should format label with result_code and name', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('R-123 - Test Result');
    });

    it('should include acronym and phase_year when available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        acronym: 'TEST',
        phase_year: '2024'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(TEST - 2024) R-123 - Test Result');
    });

    it('should include only acronym when phase_year is not available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        acronym: 'TEST'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(TEST) R-123 - Test Result');
    });

    it('should include only phase_year when acronym is not available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        phase_year: '2024'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(2024) R-123 - Test Result');
    });

    it('should include result_type_name when available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        result_type_name: 'Output'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('R-123 - Test Result (Output)');
    });

    it('should include title when available', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        title: 'Result Title'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('R-123 - Test Result - Result Title');
    });

    it('should format complete label with all fields', () => {
      const option = {
        result_code: 'R-123',
        name: 'Test Result',
        acronym: 'TEST',
        phase_year: '2024',
        result_type_name: 'Output',
        title: 'Result Title'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('(TEST - 2024) R-123 - Test Result (Output) - Result Title');
    });

    it('should return title or name as fallback', () => {
      const option = {
        title: 'Fallback Title'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('Fallback Title');
    });

    it('should return name as fallback when title is not available', () => {
      const option = {
        name: 'Fallback Name'
      };
      const result = component.formatResultLabel(option);
      expect(result).toBe('Fallback Name');
    });

    it('should return empty string for invalid option', () => {
      const result = component.formatResultLabel({});
      expect(result).toBe('');
    });
  });

  // ----- P2-3358: one single linked / bundled question for every result typology -----
  describe('P2-3358 — linked/bundled question wording', () => {
    const SINGLE_QUESTION =
      'Is this result linked or bundled with another CGIAR-reported result (such as innovation, KP, policy, etc.)?';
    const asPhase = (isCP2026: boolean) => {
      (component as any).fieldsManagerSE = { isContributorsPartners2026: () => isCP2026, isLeadContactPersonMandatory2026: () => false, fields: () => ({}), isP25: () => true };
    };
    const asResultType = (result_type_id: number) => {
      mockApiService.dataControlSE.currentResultSignal = signal({ result_type_id });
    };

    it('asks the single question for a Policy change result — its own variant is retired', () => {
      asPhase(true);
      asResultType(1); // Policy change

      expect(component.linkedResultQuestionLabel).toBe(SINGLE_QUESTION);
      expect(component.linkedResultQuestionLabel).not.toContain('contributed to this policy change');
    });

    it('asks the same single question for every other component-rendered result type', () => {
      asPhase(true);

      [3, 4, 5, 6, 8, 9].forEach(resultTypeId => {
        asResultType(resultTypeId);
        expect(component.linkedResultQuestionLabel).toBe(SINGLE_QUESTION);
      });
    });

    it('no longer opens the sentence with "Is this innovation"', () => {
      asPhase(true);
      asResultType(5);

      expect(component.linkedResultQuestionLabel).not.toContain('Is this innovation');
      expect(component.linkedResultQuestionLabel.startsWith('Is this result')).toBe(true);
    });

    it('exposes no per-typology branching for this question any more', () => {
      expect((component as any).isPolicyChangeResult).toBeUndefined();
      expect((component as any).POLICY_CHANGE_RESULT_TYPE_ID).toBeUndefined();
    });

    it('renders no header above the question — not even for a 2026 result', () => {
      asPhase(true);
      asResultType(2); // Innovation use

      expect((component as any).linkedResultHeaderLabel).toBeUndefined();
      expect((component as any).showLinkedResultHeader).toBeUndefined();
    });
  });

});

describe('RdContributorsAndPartnersComponent — reactive ToC prefill reconciliation (QA P2-2929/P2-2998)', () => {
  let component: RdContributorsAndPartnersComponent;
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let svc: any;

  const CENTERS_CATALOG = [
    { code: 'C1', institutionId: 11, full_name: 'Center One' },
    { code: 'C2', institutionId: 22, full_name: 'Center Two' }
  ];

  const SCIENCE_CATALOG = [
    { id: 1, official_code: 'SP01' },
    { id: 3, official_code: 'SP03' },
    { id: 4, official_code: 'SP04' },
    { id: 7, official_code: 'SP07' }
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    svc = {
      partnersBody: new ContributorsAndPartnersBody(),
      getSectionInformation: jest.fn(),
      loadFilteredBilateralProjects: jest.fn(),
      resetState: jest.fn(),
      setPossibleLeadCenters: jest.fn(),
      contributingInitiativeNew: [],
      leadPartnerId: null,
      leadCenterCode: null,
      updatingLeadData: false,
      scienceSelected: [],
      otherScienceSelected: [],
      otherCentersSelected: [],
      loadedAcceptedScienceIds: new Set<number>(),
      loadedPendingScience: [],
      tocReferenceSynergyInitiativeIds: signal<number[]>([]),
      tocReferenceCenterInstitutionIds: signal<number[]>([]),
      tocReferencePartnerInstitutionIds: signal<number[]>([]),
      sectionHydratedFromToc: signal(false),
      tocSelectionTouched: signal(false)
    };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [HttpClientTestingModule, FormsModule, TermPipe, CustomFieldsModule],
      providers: [
        {
          provide: ApiService,
          useValue: {
            dataControlSE: {
              currentResult: { result_code: 'R-123', version_id: 1, portfolio: 'P25' },
              currentResultSectionName: signal(''),
              findClassTenSeconds: jest.fn().mockResolvedValue(true)
            },
            resultsSE: {
              GET_resultById: jest.fn().mockReturnValue(of({ response: {} })),
              GET_generalInformationByResultId: jest.fn().mockReturnValue(of({ response: {} })),
              GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
              // Matches the catalog seeded on `component.allScienceProgramsList` below — ngOnInit's real
              // GET_AllInitiatives() call (previously uncalled only because the missing GET_AllWithoutResults
              // mock above threw first) must not wipe out this suite's fixture data.
              GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: SCIENCE_CATALOG }))
            }
          }
        },
        { provide: RdContributorsAndPartnersService, useValue: svc },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jest.fn() } },
        { provide: InstitutionsService, useValue: {} },
        { provide: RolesService, useValue: {} },
        { provide: CentersService, useValue: { centersList: CENTERS_CATALOG, centers: signal(CENTERS_CATALOG), getData: jest.fn().mockResolvedValue([]) } },
        { provide: ResultLevelService, useValue: {} },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => true, isLeadContactPersonMandatory2026: () => false, fields: () => ({}), isP25: () => true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      // Empty template: these tests exercise the effects, not the DOM — avoids mocking the whole 2026 template surface.
      .overrideComponent(RdContributorsAndPartnersComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    component = fixture.componentInstance;
    component.allScienceProgramsList.set(SCIENCE_CATALOG);
  });

  const flush = () => fixture.detectChanges();

  it('preselects the SP of the first node and prunes them when switching to a node without synergy programs', () => {
    svc.tocReferenceSynergyInitiativeIds.set([1, 3, 4]);
    flush();
    expect(svc.scienceSelected.map((sp: any) => sp.id)).toEqual([1, 3, 4]);

    // switch to Outcome 2 — no synergy programs
    svc.tocReferenceSynergyInitiativeIds.set([]);
    flush();
    expect(svc.scienceSelected).toEqual([]);
  });

  it('adds the union (deduplicated) when a second node is selected', () => {
    svc.tocReferenceSynergyInitiativeIds.set([1]);
    flush();
    svc.tocReferenceSynergyInitiativeIds.set([1, 7]);
    flush();
    expect(svc.scienceSelected.map((sp: any) => sp.id)).toEqual([1, 7]);
  });

  it('migrates persisted stale SP to Other(s), prunes stale preloaded SP, and keeps the Other sentinel', () => {
    svc.tocReferenceSynergyInitiativeIds.set([1]);
    flush();
    // persisted (no `new`) + Other sentinel appear alongside the preloaded SP01
    svc.scienceSelected = [...svc.scienceSelected, { id: 99, official_code: 'SP99' }, { id: component.OTHER_SP_CODE }];

    svc.tocReferenceSynergyInitiativeIds.set([7]);
    flush();
    const ids = svc.scienceSelected.map((sp: any) => sp.id);
    expect(ids).not.toContain(1); // stale preloaded (`new`) pruned entirely
    expect(ids).not.toContain(99); // stale persisted MOVED out, not left behind (bugfix: was orphaned before)
    expect(ids).toContain(component.OTHER_SP_CODE); // sentinel survives
    expect(ids).toContain(7); // new node preselected
    expect(svc.otherScienceSelected.map((sp: any) => sp.id)).toContain(99); // migrated here instead
  });

  it('cold-load guard (P2-3115): hydrated section without in-session ToC touch never prefills', () => {
    svc.sectionHydratedFromToc.set(true);
    svc.tocSelectionTouched.set(false);
    svc.tocReferenceSynergyInitiativeIds.set([1, 3]);
    flush();
    expect(svc.scienceSelected).toEqual([]);

    // a genuine in-session ToC selection authorizes the prefill
    svc.tocSelectionTouched.set(true);
    flush();
    expect(svc.scienceSelected.map((sp: any) => sp.id)).toEqual([1, 3]);
  });

  it('reconciles Centers on node change, recomputes leads and clears a pruned lead', () => {
    svc.tocReferenceCenterInstitutionIds.set([11]);
    flush();
    expect(svc.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1']);
    svc.leadCenterCode = 'C1';

    svc.tocReferenceCenterInstitutionIds.set([22]);
    flush();
    expect(svc.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C2']);
    expect(svc.leadCenterCode).toBeNull(); // pruned lead cleared
    expect(svc.setPossibleLeadCenters).toHaveBeenCalledWith(true);
  });

  it('unrelated effect re-runs with the same refs do not churn the selection', () => {
    svc.tocReferenceSynergyInitiativeIds.set([1]);
    flush();
    const userEdited = [{ id: 7, official_code: 'SP07', manual: true }];
    svc.scienceSelected = userEdited;

    // re-run with identical refs (e.g. other signals fire) — selection untouched
    svc.tocSelectionTouched.set(true);
    flush();
    expect(svc.scienceSelected).toBe(userEdited);
  });
});

/**
 * LC-T-2 (docs/specs/bugfix/lead-center-full-catalog): the stale "Please select at least one
 * contributing center to choose a lead center" note and its guiding `@if
 * (!possibleLeadCenters?.length)` condition were removed from the template — that condition became
 * unreachable once LC-T-1 made `possibleLeadCenters` always the full CLARISA catalog. These tests
 * render the REAL `RdContributorsAndPartnersService` (through the real `setPossibleLeadCenters()`,
 * not a mock) so the assertion actually exercises the shared fix, per the task's disqualifying
 * clause: a source-string grep would not prove the rendered DOM never shows the note.
 */
describe('RdContributorsAndPartnersComponent — Lead center full catalog rendering (LC-T-2)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let rdPartnersSE: RdContributorsAndPartnersService;
  let centersMock: { loadedCenters: BehaviorSubject<boolean>; centersList: any[]; centers: ReturnType<typeof signal<any[]>> };

  const CENTERS_CATALOG = [
    { code: 'C1', name: 'Center 1', full_name: 'Center One', institutionId: 11 },
    { code: 'C2', name: 'Center 2', full_name: 'Center Two', institutionId: 22 },
    { code: 'C3', name: 'Center 3', full_name: 'Center Three', institutionId: 33 }
  ];

  const leadCenterSelectEl = () => fixture.nativeElement.querySelector('app-pr-select[label="Lead center"]');

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
        GET_generalInformationByResultId: jest.fn().mockReturnValue(of({ response: {} })),
        GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    // The CLARISA catalogue has NOT resolved yet when the component is created — mirrors the real
    // startup sequence and the P2-3190 fixture pattern in rd-contributors-and-partners.zoneless.spec.ts.
    centersMock = { loadedCenters: new BehaviorSubject<boolean>(false), centersList: CENTERS_CATALOG, centers: signal(CENTERS_CATALOG), getData: jest.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [CommonModule, FormsModule, HttpClientTestingModule, TermPipe, CustomFieldsModule],
      providers: [
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
          useValue: { isContributorsPartners2026: () => false, isLeadContactPersonMandatory2026: () => false, fields: () => ({}), isP25: () => true, activeIndicatorsLength: () => 0, hasSelectedIndicator: () => false }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    jest.spyOn(rdPartnersSE, 'getSectionInformation').mockImplementation(() => undefined as any);
    jest.spyOn(rdPartnersSE, 'loadFilteredBilateralProjects').mockImplementation(() => undefined as any);

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    fixture.detectChanges();
  });

  it('LC-TEST-6: never renders the stale "select a contributing center first" note with 0 Contributing Centers', () => {
    // Precondition: 0 Contributing Centers (ContributorsAndPartnersBody().contributing_center is unset by resetState()).
    expect(rdPartnersSE.partnersBody.contributing_center?.length ?? 0).toBe(0);

    expect(fixture.nativeElement.textContent).not.toContain('Please select at least one contributing center to choose a lead center');
    expect(fixture.nativeElement.querySelector('.pr-message p')?.textContent).not.toContain('contributing center');
  });

  it('LC-TEST-7: the Lead center select receives a non-empty [options] binding with 0 Contributing Centers (full catalog present)', async () => {
    expect(rdPartnersSE.partnersBody.contributing_center?.length ?? 0).toBe(0);
    // Before the CLARISA catalogue resolves, `possibleLeadCenters` is still empty (post `ngOnInit`'s `resetState()`).
    expect(rdPartnersSE.possibleLeadCenters?.length ?? 0).toBe(0);

    // The CLARISA catalogue lands now — this is the REAL `RdContributorsAndPartnersService` constructor's
    // `centersSE.loadedCenters` subscription firing the REAL `setPossibleLeadCenters(true)` (LC-DD-1), with
    // 0 Contributing Centers and 0 otherCentersSelected: exactly the case the note used to gate on.
    centersMock.loadedCenters.next(true);
    await fixture.whenStable();
    // `setPossibleLeadCenters(true)` also raises `updatingLeadData` and clears it again after a 25ms
    // `setTimeout` (P2-3322) — wait that out so the select re-appears, matching the production flow.
    await new Promise(resolve => setTimeout(resolve, 30));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(rdPartnersSE.updatingLeadData).toBe(false);
    expect(rdPartnersSE.possibleLeadCenters?.length).toBe(CENTERS_CATALOG.length);

    const selectEl = leadCenterSelectEl();
    expect(selectEl).toBeTruthy();
  });

  /**
   * LC-T-4 (docs/specs/bugfix/lead-center-full-catalog, LC-DD-4): the template wires the Lead center
   * `app-pr-select`'s `(selectOptionEvent)` to `rdPartnersSE.onLeadCenterSelected($event?.code ?? null)`
   * — this proves the extraction against the REAL emitted shape (the full option object, or `null` on
   * clear), not a stubbed handler.
   */
  describe('LC-T-4: Lead center (selectOptionEvent) wiring', () => {
    beforeEach(async () => {
      // Let the select re-appear (same sequencing as LC-TEST-7) before dispatching its output.
      centersMock.loadedCenters.next(true);
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 30));
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('extracts the code from the emitted option object and forwards it to onLeadCenterSelected', () => {
      const spy = jest.spyOn(rdPartnersSE, 'onLeadCenterSelected');
      const selectDebugEl = fixture.debugElement.query(By.css('app-pr-select[label="Lead center"]'));

      selectDebugEl.triggerEventHandler('selectOptionEvent', { code: 'C1', full_name: 'Center One' });

      expect(spy).toHaveBeenCalledWith('C1');
    });

    it('forwards null when the selection is cleared (showClear emits null)', () => {
      const spy = jest.spyOn(rdPartnersSE, 'onLeadCenterSelected');
      const selectDebugEl = fixture.debugElement.query(By.css('app-pr-select[label="Lead center"]'));

      selectDebugEl.triggerEventHandler('selectOptionEvent', null);

      expect(spy).toHaveBeenCalledWith(null);
    });

    it('LC-TEST-9 end-to-end: selecting a Lead Center with 0 Contributing Centers auto-adds it via the real service (LC-DD-5: this fixture is flat/unmapped — isContributorsPartners2026() is false — so the target field is contributing_center directly, not otherCentersSelected)', () => {
      expect(rdPartnersSE.otherCentersSelected).toEqual([]);
      expect(rdPartnersSE.partnersBody.contributing_center ?? []).toEqual([]);
      const selectDebugEl = fixture.debugElement.query(By.css('app-pr-select[label="Lead center"]'));

      selectDebugEl.triggerEventHandler('selectOptionEvent', { code: 'C1', full_name: 'Center One' });

      expect(rdPartnersSE.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1']);
      expect(rdPartnersSE.otherCentersSelected).toEqual([]);
      expect(rdPartnersSE.autoAddedLeadCenterCode).toBe('C1');
    });
  });

  /**
   * LCD-T-4 (docs/specs/changes/lead-center-decouple): Lead Center renders and is `required`
   * regardless of `is_lead_by_partner` (LCD-R-1, LCD-R-2, LCD-AC-1), and the required-field scan's
   * own signal — `.pr-field.mandatory`/`complete` (src/CLAUDE.md §21.5) — reflects "no Lead Center
   * selected" as incomplete (LCD-AC-3). Renders through the REAL service (same rig as LC-T-2), so
   * the assertions exercise the actual template rather than a mocked condition.
   */
  describe('LCD-T-4: Lead Center is unconditionally rendered and required (LCD-AC-1, LCD-AC-3)', () => {
    beforeEach(async () => {
      centersMock.loadedCenters.next(true);
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 30));
      await fixture.whenStable();
      fixture.detectChanges();
    });

    /**
     * These four tests read `fixture.changeDetectorRef.detectChanges()` — NOT the usual
     * `fixture.detectChanges()` — deliberately. This app's `ComponentFixture` is `zonelessEnabled`
     * (no explicit zone.js CD provider in this spec's TestBed), and in that mode
     * `fixture.detectChanges()` always routes through `ApplicationRef.tick()`, whose own internal
     * `checkNoChanges` pass is NOT the same one `detectChanges(false)`'s escape hatch stubs out
     * (that stub only patches `componentRef.changeDetectorRef.checkNoChanges`, which
     * `ApplicationRef.tick()` never calls) — so `detectChanges(false)` cannot suppress it here, and
     * a genuine first-ever write to `is_lead_by_partner` / `leadCenterCode` (both start `undefined`,
     * `ContributorsAndPartnersBody` has no initializer) trips NG0100 no matter how many times
     * `fixture.detectChanges()` is called afterward. `fixture.changeDetectorRef.detectChanges()`
     * calls the component's own `ChangeDetectorRef` directly, applying the write to the DOM without
     * going through `ApplicationRef.tick()`'s automatic re-check.
     */
    it('LCD-AC-1: renders and is marked mandatory when is_lead_by_partner is false', () => {
      rdPartnersSE.partnersBody.is_lead_by_partner = false;
      fixture.changeDetectorRef.detectChanges();

      const selectEl = leadCenterSelectEl();
      expect(selectEl).toBeTruthy();
      expect(selectEl.querySelector('.pr-field.mandatory')).toBeTruthy();
    });

    it('LCD-AC-1: renders and is STILL marked mandatory when is_lead_by_partner is true (no longer gated by the toggle)', () => {
      rdPartnersSE.partnersBody.is_lead_by_partner = true;
      fixture.changeDetectorRef.detectChanges();

      const selectEl = leadCenterSelectEl();
      expect(selectEl).toBeTruthy();
      expect(selectEl.querySelector('.pr-field.mandatory')).toBeTruthy();
    });

    it('LCD-AC-3: with no Lead Center selected, the field is mandatory AND incomplete — what the save-blocking scan reads', () => {
      rdPartnersSE.leadCenterCode = null;
      fixture.changeDetectorRef.detectChanges();

      const fieldEl = leadCenterSelectEl().querySelector('.pr-field');
      expect(fieldEl.classList.contains('mandatory')).toBe(true);
      expect(fieldEl.classList.contains('complete')).toBe(false);
    });

    it('LCD-AC-3 (contrast): once a Lead Center is selected the field reads complete', () => {
      // Writes straight through the control's own ControlValueAccessor (`writeValue`), the same
      // technique this codebase already uses to drive a value into a bound custom-field in tests
      // (see `pr-radio-button.component.spec.ts`) — mutating `rdPartnersSE.leadCenterCode` and
      // relying on the `[(ngModel)]` model→view sync to reach the child is unreliable in this
      // zoneless test harness (the write lands, but the child's internal signal — and therefore its
      // rendered `.text`/`complete` class — never observably updates within a `detectChanges()`
      // call here); `writeValue` sets that internal signal directly, matching what NgModel would do.
      const selectDebugEl = fixture.debugElement.query(By.css('app-pr-select[label="Lead center"]'));
      (selectDebugEl.componentInstance as { writeValue: (v: any) => void }).writeValue('C1');
      fixture.detectChanges();

      const fieldEl = leadCenterSelectEl().querySelector('.pr-field');
      expect(fieldEl.classList.contains('complete')).toBe(true);
    });
  });

  /**
   * LCD-AC-6 (docs/specs/changes/lead-center-decouple): regression guard — `LC-DD-5`'s
   * auto-add-to-Contributing-Centers on `onLeadCenterSelected` must keep firing now that Lead
   * Center no longer depends on `is_lead_by_partner`. Added ALONGSIDE the existing `LC-T-4`
   * describe above, which stays unmodified per this task's brief.
   */
  describe('LCD-T-4: onLeadCenterSelected auto-add still fires with is_lead_by_partner = true (LCD-AC-6)', () => {
    beforeEach(async () => {
      centersMock.loadedCenters.next(true);
      await fixture.whenStable();
      await new Promise(resolve => setTimeout(resolve, 30));
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('auto-adds the selected Lead Center to Contributing CGIAR Centers even when is_lead_by_partner is true', () => {
      rdPartnersSE.partnersBody.is_lead_by_partner = true;
      // See the LCD-AC-1 tests above for why this uses `fixture.changeDetectorRef.detectChanges()`.
      fixture.changeDetectorRef.detectChanges();

      expect(rdPartnersSE.otherCentersSelected).toEqual([]);
      expect(rdPartnersSE.partnersBody.contributing_center ?? []).toEqual([]);

      rdPartnersSE.onLeadCenterSelected('C1');

      expect(rdPartnersSE.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1']);
      expect(rdPartnersSE.autoAddedLeadCenterCode).toBe('C1');
    });
  });
});

/**
 * TOC-T-1 (docs/specs/bugfix/toc-unmapped-orange-notes/tasks.md): the Centers (~L100) and Science
 * Program (~L302) gates only checked `isCP2026()`, not whether the result was actually mapped to a
 * ToC node — so answering **No** ("Can this result be mapped to a ToC KPI?", `planned_result ===
 * false`) fired the "not found" orange note unconditionally, even though no node was ever selected.
 * Fix (design.md §6.2 / TOC-DD-1): extend both gates with
 * `&& partnersBody.result_toc_result.planned_result !== false`.
 *
 * Renders through the REAL `RdContributorsAndPartnersService` (like LC-T-2) so the assertions
 * exercise the actual rendered DOM, not a mocked condition.
 */
describe('RdContributorsAndPartnersComponent — Suppress ToC "not found" notes on unmapped results (TOC-T-1)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let rdPartnersSE: RdContributorsAndPartnersService;

  const CENTERS_CATALOG = [
    { code: 'C1', name: 'Center 1', full_name: 'Center One', institutionId: 11 },
    { code: 'C2', name: 'Center 2', full_name: 'Center Two', institutionId: 22 }
  ];

  const SCIENCE_CATALOG = [
    { id: 1, official_code: 'SP01', full_name: 'Science Program One' },
    { id: 2, official_code: 'SP02', full_name: 'Science Program Two' }
  ];

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
        GET_generalInformationByResultId: jest.fn().mockReturnValue(of({ response: {} })),
        GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: SCIENCE_CATALOG })),
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    const centersMock = { loadedCenters: new BehaviorSubject<boolean>(true), centersList: CENTERS_CATALOG, centers: signal(CENTERS_CATALOG), getData: jest.fn().mockResolvedValue([]) };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [CommonModule, FormsModule, HttpClientTestingModule, TermPipe, CustomFieldsModule],
      providers: [
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
          useValue: { isContributorsPartners2026: () => true, isLeadContactPersonMandatory2026: () => false, fields: () => ({}), isP25: () => true, activeIndicatorsLength: () => 0, hasSelectedIndicator: () => false }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    jest.spyOn(rdPartnersSE, 'getSectionInformation').mockImplementation(() => undefined as any);
    jest.spyOn(rdPartnersSE, 'loadFilteredBilateralProjects').mockImplementation(() => undefined as any);

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    fixture.detectChanges();
  });

  const messageTexts = () => Array.from(fixture.nativeElement.querySelectorAll('.pr-message')).map((el: any) => el.textContent as string);

  it('TOC-AC-1: planned_result = false — no "not found" notes for Centers or Science, both fall back to their full-catalog dropdown', () => {
    rdPartnersSE.partnersBody.result_toc_result.planned_result = false;
    fixture.detectChanges();

    const messages = messageTexts();
    expect(messages.some(m => m.includes('No CGIAR Centers related'))).toBe(false);
    expect(messages.some(m => m.includes('No Science Programs related'))).toBe(false);

    // Centers: falls through to the pre-existing flat/full-catalog branch (the real @else of the
    // modified gate), bound to `centersSE.centers()` — never the empty reference-filtered dropdown.
    // Assert the bound [options] too, not just presence: a wrong/empty catalog binding would still
    // pass a truthy-element check.
    const flatCenters = fixture.debugElement.query(By.css('app-pr-multi-select[data-testid="cp-field-contributing_center~flat"]'));
    expect(flatCenters).toBeTruthy();
    expect(flatCenters.componentInstance.options()).toEqual(CENTERS_CATALOG);
    expect(fixture.nativeElement.querySelector('app-pr-multi-select[data-testid="cp-field-contributing_center"]')).toBeFalsy();

    // TOC-T-1 (attempt 3): the sibling "Other(s)" auto-activation block (~L163) previously fired
    // whenever !hasReferenceCenters() — which is now also true in the unmapped state — duplicating
    // this same "Contributing CGIAR Centers" control bound to a different model (otherCentersSelected).
    // With otherCentersSelected empty, exactly ONE Centers control must render.
    expect(rdPartnersSE.otherCentersSelected).toEqual([]);
    expect(fixture.nativeElement.querySelector('app-pr-multi-select[data-testid="toc-other-centers"]')).toBeFalsy();
    expect(fixture.debugElement.queryAll(By.css('app-pr-multi-select[data-testid^="cp-field-contributing_center"], app-pr-multi-select[data-testid="toc-other-centers"]')).length).toBe(1);

    // Science (TOC-T-1 rework, attempt 2 — reviewer FAIL on attempt 1): the reference/note branch now
    // also requires planned_result !== false, so on unmapped it falls into the @else — whose note is
    // itself gated on planned_result !== false and therefore suppressed. But the section must stay
    // reachable: the Other(s) full-catalog dropdown auto-activates because hasReferenceScience() is
    // false (no ToC node was ever selected to populate it), rendering with the PRIMARY label (not
    // "Other(s) Science Program(s)") and bound to the full catalog (otherScienceList() excludes
    // nothing when there are no reference ids to filter out).
    const otherScience = fixture.debugElement.query(By.css('app-pr-multi-select[data-testid="toc-other-science"]'));
    expect(otherScience).toBeTruthy();
    expect(otherScience.componentInstance.options()).toEqual(SCIENCE_CATALOG);
    expect(fixture.nativeElement.textContent).toContain('Contributing Science Program/Accelerator');
  });

  it('TOC-T-1 (attempt 3): unmapped + otherCentersSelected populated (LC-DD-4 auto-add) — BOTH the flat dropdown AND toc-other-centers render, chip visible and removable', () => {
    rdPartnersSE.partnersBody.result_toc_result.planned_result = false;
    // Simulates RdContributorsAndPartnersService.onLeadCenterSelected auto-adding a picked Lead Center
    // into otherCentersSelected when the contributing-centers union is empty (CLAUDE.md LC-DD-4).
    rdPartnersSE.otherCentersSelected = [{ ...CENTERS_CATALOG[0] }] as any;
    fixture.detectChanges();

    const flatCenters = fixture.debugElement.query(By.css('app-pr-multi-select[data-testid="cp-field-contributing_center~flat"]'));
    expect(flatCenters).toBeTruthy();

    // The block (and its dropdown) must stay reachable so the auto-added Lead Center is visible.
    expect(fixture.debugElement.query(By.css('app-pr-multi-select[data-testid="toc-other-centers"]'))).toBeTruthy();

    // The chip is rendered from a DIRECT *ngFor over rdPartnersSE.otherCentersSelected (html:184),
    // independent of the multi-select's internal CVA value — this is the "visible and removable"
    // contract the fix must preserve. Confirms the chip text AND its remove ("cancel" icon) affordance.
    // contributing_center is empty in this scenario (nothing was ToC-mapped or manually added there),
    // so the only chip rendered by either *ngFor is this one, sourced from otherCentersSelected.
    const chips = fixture.debugElement.queryAll(By.css('.medal_selector .centers.chips_container .center'));
    expect(chips.length).toBe(1);
    expect(chips[0].nativeElement.textContent).toContain('Center 1');
    expect(chips[0].query(By.css('i.material-icons-round'))).toBeTruthy();
  });

  it('TOC-AC-2 (AC4 regression guard): planned_result = true with empty ToC reference ids still shows both "not found" notes', () => {
    rdPartnersSE.partnersBody.result_toc_result.planned_result = true;
    // tocReferenceCenterInstitutionIds() / tocReferenceSynergyInitiativeIds() default to [] — genuinely
    // mapped result whose ToC node brought back no centers/programs.
    fixture.detectChanges();

    const messages = messageTexts();
    expect(messages.some(m => m.includes('No CGIAR Centers related'))).toBe(true);
    expect(messages.some(m => m.includes('No Science Programs related'))).toBe(true);

    // TOC-T-1 (attempt 3): mapped + genuinely empty refs is unaffected by the new planned_result
    // clause on the Centers "Other(s)" block — AC4 auto-activation must still fire here.
    expect(fixture.nativeElement.querySelector('app-pr-multi-select[data-testid="toc-other-centers"]')).toBeTruthy();
  });
});

// ----- P2-3249: "Contributing CGIAR Centers" mandatory + at least one centre from the ToC -----
/**
 * The rule has THREE preconditions and they are disjoint (decision recorded on P2-3249, 2026-08-28):
 *   2026 split + ToC brings centres  → only a ToC-bucket centre satisfies it ("Other(s)" never does);
 *   2026 split + ToC brings none     → the "Other(s)" dropdown IS the field, so any centre satisfies it;
 *   pre-2026 flat dropdown           → no ToC bucket exists, so any centre satisfies it.
 *
 * `isContributorsPartners2026` is mocked as a SIGNAL on purpose: `isCP2026` is a `computed()`, so a plain
 * function returning a constant would let the first read cache forever and the phase flip would be a no-op.
 */
describe('RdContributorsAndPartnersComponent — Contributing CGIAR Centers mandatory rule (P2-3249)', () => {
  let component: RdContributorsAndPartnersComponent;
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let svc: any;
  let is2026: any;

  const CENTERS_CATALOG = [
    { code: 'C1', institutionId: 11, full_name: 'Center One' },
    { code: 'C2', institutionId: 22, full_name: 'Center Two' }
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    is2026 = signal(true);
    svc = {
      partnersBody: new ContributorsAndPartnersBody(),
      getSectionInformation: jest.fn(),
      loadFilteredBilateralProjects: jest.fn(),
      resetState: jest.fn(),
      setPossibleLeadCenters: jest.fn(),
      contributingInitiativeNew: [],
      leadPartnerId: null,
      leadCenterCode: null,
      updatingLeadData: false,
      scienceSelected: [],
      otherScienceSelected: [],
      otherCentersSelected: [],
      otherPartnersSelected: [],
      loadedAcceptedScienceIds: new Set<number>(),
      loadedPendingScience: [],
      OTHER_PARTNERS_CODE: '__OTHER_PARTNERS__',
      tocReferenceSynergyInitiativeIds: signal<number[]>([]),
      tocReferenceCenterInstitutionIds: signal<number[]>([]),
      tocReferencePartnerInstitutionIds: signal<number[]>([]),
      // Hydrated + untouched: the preselection effect must not silently fill the field for us.
      sectionHydratedFromToc: signal(true),
      tocSelectionTouched: signal(false)
    };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [HttpClientTestingModule, FormsModule, TermPipe, CustomFieldsModule],
      providers: [
        {
          provide: ApiService,
          useValue: {
            dataControlSE: {
              currentResult: { result_code: 'R-123', version_id: 1, portfolio: 'P25' },
              currentResultSectionName: signal(''),
              findClassTenSeconds: jest.fn().mockResolvedValue(true)
            },
            resultsSE: {
              GET_resultById: jest.fn().mockReturnValue(of({ response: {} })),
              GET_generalInformationByResultId: jest.fn().mockReturnValue(of({ response: {} })),
              PATCH_ContributorsPartners: jest.fn().mockReturnValue(of({}))
            }
          }
        },
        { provide: RdContributorsAndPartnersService, useValue: svc },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jest.fn() } },
        { provide: InstitutionsService, useValue: {} },
        { provide: RolesService, useValue: {} },
        { provide: CentersService, useValue: { centersList: CENTERS_CATALOG, centers: signal(CENTERS_CATALOG), getData: jest.fn().mockResolvedValue([]) } },
        { provide: ResultLevelService, useValue: {} },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => is2026(), isLeadContactPersonMandatory2026: () => false, fields: () => ({}), isP25: () => true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      // Empty template: these cases exercise the rule, not the DOM. The DOM contract (that the marker really
      // reaches the mandatory-field scan) is asserted in rd-contributors-and-partners.zoneless.spec.ts.
      .overrideComponent(RdContributorsAndPartnersComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    component = fixture.componentInstance;
  });

  const tocCenter = (code: string) => ({ code, institutionId: code === 'C1' ? 11 : 22, full_name: `Center ${code}` });

  describe('2026 split, the ToC DOES bring centres', () => {
    beforeEach(() => {
      svc.tocReferenceCenterInstitutionIds.set([11, 22]);
      fixture.detectChanges();
    });

    it('requires a ToC centre', () => {
      expect(component.requiresTocCenter).toBe(true);
    });

    it('is incomplete with nothing selected', () => {
      svc.partnersBody.contributing_center = [];
      expect(component.contributingCentersComplete).toBe(false);
    });

    it('is complete with one ToC centre selected', () => {
      svc.partnersBody.contributing_center = [tocCenter('C1')];
      expect(component.contributingCentersComplete).toBe(true);
    });

    it('stays complete after deselecting one of two ToC centres (AC: one may remain)', () => {
      svc.partnersBody.contributing_center = [tocCenter('C1'), tocCenter('C2')];
      expect(component.contributingCentersComplete).toBe(true);
      svc.partnersBody.contributing_center = [tocCenter('C2')];
      expect(component.contributingCentersComplete).toBe(true);
    });

    // THE ticket. "Other(s)" centres must not satisfy the minimum on their own.
    it('is INCOMPLETE when every ToC centre is removed and only "Other(s)" centres remain', () => {
      svc.partnersBody.contributing_center = [{ code: component.OTHER_CENTERS_CODE }];
      svc.otherCentersSelected = [
        { code: 'ZZZ', institutionId: 99 },
        { code: 'YYY', institutionId: 98 }
      ];
      expect(component.otherCentersSelectedCount).toBe(2);
      expect(component.contributingCentersComplete).toBe(false);
    });

    it('does not count the UI-only "Other(s)" sentinel as a selected ToC centre', () => {
      svc.partnersBody.contributing_center = [{ code: component.OTHER_CENTERS_CODE }];
      expect(component.tocCentersSelectedCount).toBe(0);
    });

    it('is complete when a ToC centre AND "Other(s)" centres are selected together', () => {
      svc.partnersBody.contributing_center = [tocCenter('C1'), { code: component.OTHER_CENTERS_CODE }];
      svc.otherCentersSelected = [{ code: 'ZZZ', institutionId: 99 }];
      expect(component.contributingCentersComplete).toBe(true);
    });

    // The missing-fields LABEL lives as a static attribute in the template (the directive freezes a bound one),
    // so it is asserted against the rendered DOM in rd-contributors-and-partners.zoneless.spec.ts.
    it('names the ToC condition in the inline validation message', () => {
      expect(component.contributingCentersValidationMessage).toContain('Theory of Change');
      expect(component.contributingCentersValidationMessage).toContain('Other(s)');
    });
  });

  describe('2026 split, the ToC brings NO centres (P2-3324 / P2-3326 branch)', () => {
    beforeEach(() => {
      svc.tocReferenceCenterInstitutionIds.set([]);
      fixture.detectChanges();
    });

    it('does not require a ToC centre — that would be impossible to satisfy', () => {
      expect(component.hasReferenceCenters()).toBe(false);
      expect(component.requiresTocCenter).toBe(false);
    });

    it('is incomplete with nothing selected — "Other(s)" is mandatory here', () => {
      svc.partnersBody.contributing_center = [];
      svc.otherCentersSelected = [];
      expect(component.contributingCentersComplete).toBe(false);
    });

    it('is complete with an "Other(s)" centre alone', () => {
      svc.otherCentersSelected = [{ code: 'ZZZ', institutionId: 99 }];
      expect(component.contributingCentersComplete).toBe(true);
    });

    it('uses the generic message, with no ToC condition in it', () => {
      expect(component.contributingCentersValidationMessage).not.toContain('Theory of Change');
    });
  });

  // Constraint: there are TWO code paths for this dropdown and a rule added to one silently misses the other.
  describe('pre-2026 flat dropdown', () => {
    beforeEach(() => {
      is2026.set(false);
      svc.tocReferenceCenterInstitutionIds.set([11, 22]);
      fixture.detectChanges();
    });

    it('never requires a ToC centre — the flat path has no ToC bucket, even when the ToC has centres', () => {
      expect(component.isCP2026()).toBe(false);
      expect(component.hasReferenceCenters()).toBe(true);
      expect(component.requiresTocCenter).toBe(false);
    });

    it('is incomplete with nothing selected', () => {
      svc.partnersBody.contributing_center = [];
      expect(component.contributingCentersComplete).toBe(false);
    });

    it('is complete with any centre from the flat catalogue', () => {
      svc.partnersBody.contributing_center = [tocCenter('C1')];
      expect(component.contributingCentersComplete).toBe(true);
    });
  });

  // ⚠️ Legacy `from_toc = 0` rows: the column is NOT NULL DEFAULT 0, so a result saved before the 2026 split
  // loads every centre into "Other(s)". Documented and deliberate: the rule fires and the user re-picks a ToC centre.
  it('reports a legacy result (every centre bucketed as Other) as incomplete, but never blocks the PATCH', () => {
    svc.tocReferenceCenterInstitutionIds.set([11, 22]);
    fixture.detectChanges();
    svc.partnersBody.contributing_center = [{ code: component.OTHER_CENTERS_CODE }];
    svc.otherCentersSelected = [{ code: 'C1', institutionId: 11, from_toc: 0 }];

    expect(component.contributingCentersComplete).toBe(false);

    // Save draft still goes through: this is feedback (src/CLAUDE.md §21.5 layer 1), not a hard gate.
    component.onSaveSection();
    expect((component as any).api.resultsSE.PATCH_ContributorsPartners).toHaveBeenCalled();
  });
});

/**
 * `UCA-T-9` — `CanComponentDeactivate` wiring for `RdContributorsAndPartnersComponent` (P25).
 * `SectionDirtyTrackerService` is component-scoped (`providers: [SectionDirtyTrackerService]`), so
 * each spec gets a fresh instance via `TestBed.createComponent`.
 *
 * Renders through the REAL `RdContributorsAndPartnersService` (same rig as `LC-T-2` above) — the
 * dirty-diff snapshot target, `partnersBody`, lives on the service, not the component, so a mocked
 * service (as the top-level `describe` in this file uses) cannot exercise the real load/save
 * timing. `GET_ContributorsPartners` / `PATCH_ContributorsPartners` are mocked with a genuine async
 * boundary (`delay(0)`, driven with `fakeAsync`/`tick`) instead of a synchronous `of(...)` — a
 * synchronous mock would collapse the real production race between `getSectionInformation()`'s
 * `next` handler (which ends in `loadFilteredBilateralProjects()`, itself async but never mutating
 * `partnersBody`) and the dirty-tracker snapshot into something that passes even when the
 * implementation snapshots too early.
 */
describe('RdContributorsAndPartnersComponent — CanComponentDeactivate (UCA-T-9)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let component: RdContributorsAndPartnersComponent;
  let rdPartnersSE: RdContributorsAndPartnersService;
  let apiMock: any;

  /** Local, test-scoped literal — never shared with other describes, so no cross-test mutation risk. */
  const loadResponse = () => ({
    no_applicable_partner: false,
    institutions: [],
    mqap_institutions: [],
    contributing_center: [],
    contributing_np_projects: [],
    contributing_and_primary_initiative: [],
    contributing_initiatives: { accepted_contributing_initiatives: [], pending_contributing_initiatives: [] },
    result_toc_result: { initiative_id: 1, result_toc_results: [] },
    contributors_result_toc_result: null,
    bilateral_projects: [],
    linked_results: []
  });

  beforeEach(async () => {
    const currentResult = {
      id: 1,
      result_code: 'R-1',
      portfolio: 'P25',
      initiative_id: 5,
      initiative_official_code: 'INIT-05',
      status: null
    };

    apiMock = {
      dataControlSE: {
        currentResult,
        currentResultSignal: signal(currentResult),
        currentResultSectionName: signal(''),
        findClassTenSeconds: jest.fn().mockResolvedValue(true),
        isKnowledgeProduct: false,
        showPartnersRequest: false
      },
      resultsSE: {
        GET_ContributorsPartners: jest.fn(() => of({ response: loadResponse() }).pipe(delay(0))),
        PATCH_ContributorsPartners: jest.fn(() => of({ response: {} }).pipe(delay(0))),
        GET_resultById: jest.fn().mockReturnValue(of({ response: currentResult })),
        GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] })),
        GET_W3BilateralProjects: jest.fn().mockReturnValue(of({ response: [] })),
        GET_W3BilateralProjectsByProgram: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: { readOnly: false }
    };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [CommonModule, FormsModule, HttpClientTestingModule, TermPipe, CustomFieldsModule],
      providers: [
        RdContributorsAndPartnersService,
        { provide: ApiService, useValue: apiMock },
        { provide: RolesService, useValue: { readOnly: false } },
        {
          provide: InstitutionsService,
          useValue: { loadedInstitutions: new BehaviorSubject<boolean>(false), institutionsList: [], institutionsWithoutCentersList: [] }
        },
        {
          provide: CentersService,
          useValue: { loadedCenters: new BehaviorSubject<boolean>(false), centersList: [], centers: signal([]), getData: jest.fn().mockResolvedValue([]) }
        },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: ResultLevelService, useValue: { currentResultLevelId: 2 } },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        {
          provide: FieldsManagerService,
          useValue: { isContributorsPartners2026: () => false, isLeadContactPersonMandatory2026: () => false, fields: () => ({}), isP25: () => true }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      // Empty template: these cases exercise the load/save timing contract, not the DOM.
      .overrideComponent(RdContributorsAndPartnersComponent, { set: { template: '' } })
      .compileComponents();

    rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    component = fixture.componentInstance;
  });

  it('is false right after the load flow genuinely completes', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.hasUnsavedChanges()).toBe(false);

    discardPeriodicTasks();
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

    discardPeriodicTasks();
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

    apiMock.resultsSE.GET_ContributorsPartners.mockReturnValue(throwError(() => new Error('reload failed')));

    let sawTrue = false;
    component.saveSection().subscribe(result => {
      sawTrue = result === true;
      expect(component.hasUnsavedChanges()).toBe(false);
    });
    tick();

    expect(sawTrue).toBe(true);

    discardPeriodicTasks();
  }));

  /**
   * Falsifying input: letting the underlying HTTP error propagate as an unhandled observable error
   * (instead of resolving `false`) would break `UnsavedChangesGuard`'s `switchMap`/subscribe chain
   * rather than cleanly blocking navigation.
   */
  it('saveSection() resolves false (not throws) on a failing PATCH_ContributorsPartners, without reloading the section', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const reloadSpy = jest.spyOn(rdPartnersSE, 'getSectionInformation');
    apiMock.resultsSE.PATCH_ContributorsPartners.mockReturnValue(throwError(() => new Error('save failed')));

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

    discardPeriodicTasks();
  }));

  /**
   * `UCA-T-9` DoD: "A test explicitly asserts that clicking Next on a dirty `rd-contributors-and-partners`
   * DOES call `PATCH_ContributorsPartners`" — confirms the uniform-behavior decision (`design.md` §13,
   * no exception for the email side effect) is actually implemented, not silently carved out.
   * Falsifying input: an implementation that skips the save on this component (e.g. a leftover
   * copy-paste of an `autosaveDisabled`-style carve-out from a different spec) would leave
   * `PATCH_ContributorsPartners` uncalled here.
   */
  it('clicking Next (saveSection()) on a dirty section DOES call PATCH_ContributorsPartners — no email carve-out', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    rdPartnersSE.partnersBody.no_applicable_partner = true;
    expect(component.hasUnsavedChanges()).toBe(true);

    let result: boolean | undefined;
    component.saveSection().subscribe(value => (result = value));
    tick();

    expect(apiMock.resultsSE.PATCH_ContributorsPartners).toHaveBeenCalled();
    expect(result).toBe(true);

    discardPeriodicTasks();
  }));

  /**
   * `UCA-T-9` rework, Discovered Issue 1 regression test (Reviewer's HIGHEST-severity attempt-1
   * FAIL). Simulates the EXACT post-snapshot writes `CPMultipleWPsComponent.ngOnChanges()` (the
   * client-only `uniqueId` stamp, `multiple-wps.component.ts:82-84`) and
   * `CPMultipleWPsContentComponent.getIndicatorsList()` (the `related_node_id` mirror of
   * `toc_results_indicator_id`, and the `toc_progressive_narrative` `null` → `''` default,
   * `multiple-wps-content.component.ts:360-361`) perform on a REAL `result_toc_result
   * .result_toc_results` row — driven directly on the loaded object rather than mounting the full
   * child subtree (whose own dependency tree — `TocApiService`, `TocInitiativeOutcomeListsService`,
   * `RdTheoryOfChangesServicesService` — is out of proportion to this fix), per the reviewer's
   * documented fallback for this exact case.
   *
   * Falsifying input: without `normalizeTocResultsForDiff()`, this test fails — a freshly loaded,
   * untouched section would report `hasUnsavedChanges() === true`, which is the Reviewer's exact
   * production bug (a spurious `PATCH_ContributorsPartners` carrying `email_template:
   * 'email_template_contribution'` on the very next Back/Next). Self-verified: reverting
   * `dirtySnapshotValue()`/`normalizeTocResultsForDiff()` to snapshot/diff raw `partnersBody` makes
   * this test fail.
   */
  it('stays clean after the exact child-component post-snapshot writes (uniqueId stamp, related_node_id mirror, toc_progressive_narrative default)', fakeAsync(() => {
    apiMock.resultsSE.GET_ContributorsPartners.mockReturnValue(
      of({
        response: {
          ...loadResponse(),
          result_toc_result: {
            initiative_id: 1,
            planned_result: true,
            result_toc_results: [
              {
                toc_result_id: 10,
                toc_level_id: 1,
                indicators: [{ toc_results_indicator_id: 99, related_node_id: null }],
                toc_progressive_narrative: null
              }
            ]
          }
        }
      }).pipe(delay(0))
    );

    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    // Verbatim `CPMultipleWPsComponent.ngOnChanges()` write.
    rdPartnersSE.partnersBody.result_toc_result.result_toc_results.forEach((tab: any, index: number) => {
      tab.uniqueId = index.toString();
    });
    // Verbatim `CPMultipleWPsContentComponent.getIndicatorsList()` writes.
    const tab: any = rdPartnersSE.partnersBody.result_toc_result.result_toc_results[0];
    tab.indicators[0].related_node_id = tab.indicators[0].toc_results_indicator_id;
    if (!tab.toc_progressive_narrative) tab.toc_progressive_narrative = '';

    expect(component.hasUnsavedChanges()).toBe(false);

    discardPeriodicTasks();
  }));

  /**
   * `UCA-T-9` rework, Discovered Issue 2 regression tests. Falsifying input: a `hasUnsavedChanges()`
   * that only diffs `partnersBody` (attempt 1's bug) would report `false` for every one of these —
   * Next would then silently navigate away without saving a genuine mandatory-field edit.
   */
  it('is true after editing ONLY leadCenterCode, with partnersBody left byte-identical', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    rdPartnersSE.leadCenterCode = 'a-brand-new-lead-center-code';

    expect(component.hasUnsavedChanges()).toBe(true);

    discardPeriodicTasks();
  }));

  it('is true after editing ONLY leadPartnerId, with partnersBody left byte-identical', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    rdPartnersSE.leadPartnerId = 4242;

    expect(component.hasUnsavedChanges()).toBe(true);

    discardPeriodicTasks();
  }));

  it('is true after editing ONLY otherCentersSelected, with partnersBody left byte-identical', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    rdPartnersSE.otherCentersSelected = [{ code: 'other-center-1' } as any];

    expect(component.hasUnsavedChanges()).toBe(true);

    discardPeriodicTasks();
  }));

  it('is true after editing ONLY scienceSelected, with partnersBody left byte-identical', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(component.hasUnsavedChanges()).toBe(false);

    rdPartnersSE.scienceSelected = [{ id: 321 } as any];

    expect(component.hasUnsavedChanges()).toBe(true);

    discardPeriodicTasks();
  }));

  /**
   * `UCA-T-9` rework attempt 3, Issue 1 regression test (Reviewer's attempt-2 FAIL — the highest
   * priority issue). Simulates the genuine cold-entry race: the CLARISA institutions/centers
   * catalogues are STILL LOADING when `GET_ContributorsPartners` resolves (this rig's
   * `InstitutionsService`/`CentersService` mocks start with empty lists and `loadedInstitutions`/
   * `loadedCenters` at `false`, exactly like a hard reload straight onto this section), so the
   * synchronous auto-assign inside the load flow cannot resolve `leadPartnerId`/`leadCenterCode` even
   * though the loaded body carries a persisted leading partner/center (`is_leading_result: true`).
   * The catalogues then emit `loaded: true` AFTER the section's own load-flow snapshot already ran —
   * the exact race `RdContributorsAndPartnersService`'s constructor subscriptions create.
   *
   * Falsifying input: without `reconcileLeadFieldsAfterLateCatalogue()`, this test fails —
   * `hasUnsavedChanges()` stays `true` after the late catalogue emission settles, because the
   * dirty-diff baseline still holds the load-time (unresolved) `leadPartnerId`/`leadCenterCode`
   * while the live value now reflects the late auto-assign. Self-verified: commenting out the
   * `this.onCatalogueDrivenLeadUpdate?.()` calls in `rd-contributors-and-partners.service.ts` (or
   * reverting `reconcileLeadFieldsAfterLateCatalogue()` to a no-op) makes this test fail with
   * `hasUnsavedChanges()` returning `true`; reapplying makes it pass.
   */
  it('stays clean after a late CLARISA catalogue emission resolves a persisted leading partner/center AFTER load (cold-entry race)', fakeAsync(() => {
    const institutionsMock: any = TestBed.inject(InstitutionsService);
    const centersMock: any = TestBed.inject(CentersService);

    apiMock.resultsSE.GET_ContributorsPartners.mockReturnValue(
      of({
        response: {
          ...loadResponse(),
          institutions: [{ institutions_id: 77, is_leading_result: true, obj_institutions: {} }],
          // TWO contributing centers on purpose: `runAutoAssignLeads()`'s own single-center
          // auto-assign (`tryAutoAssignLeadCenter`) resolves `leadCenterCode` from `partnersBody`
          // alone whenever exactly one contributing center exists — that path is independent of the
          // CLARISA catalogue and would resolve correctly even during the race, masking the exact
          // bug this test targets. With two centers, that auto-assign is a no-op and
          // `setLeadCenterOnLoad`'s catalogue-dependent lookup is the ONLY path that can resolve it.
          contributing_center: [
            { code: 'C-77', is_leading_result: true },
            { code: 'C-88', is_leading_result: false }
          ]
        }
      }).pipe(delay(0))
    );

    fixture.detectChanges();
    tick();

    // Load-time auto-assign found nothing (both catalogues were still empty), so the baseline holds
    // unresolved lead fields — reading as `false` here is the same false-negative the ORIGINAL
    // `UCA-T-9` attempt-1 bug produced, now correctly masked because nothing has diverged from the
    // baseline yet.
    expect(component.hasUnsavedChanges()).toBe(false);

    // The catalogues resolve LATE, after the section's own load — simulates the genuine cold-entry
    // race (`InstitutionsService` has no bootstrap prefetch at all).
    institutionsMock.institutionsList = [{ institutions_id: 77 }];
    institutionsMock.institutionsWithoutCentersList = [{ institutions_id: 77 }];
    institutionsMock.loadedInstitutions.next(true);
    centersMock.centersList = [{ code: 'C-77' }, { code: 'C-88' }];
    centersMock.loadedCenters.next(true);
    tick();

    expect(rdPartnersSE.leadPartnerId).toBe(77);
    expect(rdPartnersSE.leadCenterCode).toBe('C-77');
    expect(component.hasUnsavedChanges()).toBe(false);

    discardPeriodicTasks();
  }));

  /**
   * Companion falsifying-input test: the reconciliation above must NOT mask a genuine concurrent
   * user edit. If a real edit happens in the same window as the late catalogue emission, the section
   * must still report dirty afterward.
   */
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

    discardPeriodicTasks();
  }));

  /**
   * `UCA-T-9` rework attempt 4 regression test (the missing companion test the Reviewer's HALT
   * flagged). Attempt 3's `reconcileLeadFieldsAfterLateCatalogue()` substituted BOTH `leadCenterCode`
   * AND `leadPartnerId` back to the stored baseline whenever EITHER catalogue emitted, regardless of
   * which one actually could have changed. So editing ONLY `leadCenterCode` (a field the
   * `institutions` catalogue never touches) and then letting `institutions` emit late would silently
   * fold the edit away and report clean — real, silent data loss on a mandatory field, and the exact
   * scenario that fired the contribution email on the very next Back/Next.
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

    discardPeriodicTasks();
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

    discardPeriodicTasks();
  }));
});
