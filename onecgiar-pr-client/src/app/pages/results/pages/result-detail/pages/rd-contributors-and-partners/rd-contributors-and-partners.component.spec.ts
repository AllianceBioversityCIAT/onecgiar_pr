import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, of, throwError } from 'rxjs';
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
      updatingLeadData: false
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
        { provide: CentersService, useValue: { centers: signal([]) } },
        { provide: ResultLevelService, useValue: {} },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => false, isP25: () => false } }
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

    it('TOC-SP-AC-4: combined count governs the guard — deleting the "Other" one leaves 1 (from ToC), no alert', () => {
      mockRdPartnersSE.scienceSelected = [SP01];
      mockRdPartnersSE.otherScienceSelected = [OTHER_SP];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([1]);

      component.deleteOtherScience(0);

      expect(mockRdPartnersSE.otherScienceSelected).toEqual([]);
      expect(mockRdPartnersSE.scienceSelected).toEqual([SP01]);
      expect(mockCustomizedAlertsFeSE.show).not.toHaveBeenCalled();
    });

    it('sentinel-cascade: deleting the OTHER_SP_CODE sentinel is blocked when it is the only thing keeping the real count above zero', () => {
      // scienceSelected holds only the "Other(s)" sentinel chip (no real ToC-origin SP); the one real
      // SP lives in otherScienceSelected, which the sentinel's deletion would cascade-clear.
      mockRdPartnersSE.scienceSelected = [{ id: component.OTHER_SP_CODE }];
      mockRdPartnersSE.otherScienceSelected = [OTHER_SP];
      mockRdPartnersSE.tocReferenceSynergyInitiativeIds.set([1]); // ToC guard active

      component.deleteScience(0);

      // AND IT MUST count otherScienceSelected toward the real total even when the sentinel (not a
      // real chip) is what's being deleted — the block proves the cascade was actually counted.
      expect(mockCustomizedAlertsFeSE.show).toHaveBeenCalledTimes(1);
      expect(mockRdPartnersSE.scienceSelected).toEqual([{ id: component.OTHER_SP_CODE }]);
      expect(mockRdPartnersSE.otherScienceSelected).toEqual([OTHER_SP]);
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

    it('should call getSectionInformation after successful save', () => {
      component.onSaveSection();
      expect(mockApiService.resultsSE.PATCH_ContributorsPartners).toHaveBeenCalled();
      // `PATCH_ContributorsPartners` is mocked with `of({})`, which emits synchronously, so the
      // subscribe callback (and its `getSectionInformation(null, true)` call) already ran by the time
      // `onSaveSection()` returns above — no `setTimeout` needed. A fire-and-forget `setTimeout(..., 0)`
      // assertion here doesn't fail this test on a regression (Jest doesn't wait for it); worse, if it
      // ever throws, that throw surfaces as an uncaught exception attributed to whatever OTHER test
      // happens to be running when the timer fires.
      expect(mockRdPartnersSE.getSectionInformation).toHaveBeenCalledWith(null, true);
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

  describe('getMessageLead', () => {
    it('should return message for partner when is_lead_by_partner is true', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = true;
      const message = component.getMessageLead();
      expect(message).toContain('partner');
      expect(message).toContain('Only partners');
    });

    it('should return message for CG Center when is_lead_by_partner is false', () => {
      mockRdPartnersSE.partnersBody.is_lead_by_partner = false;
      const message = component.getMessageLead();
      expect(message).toContain('CG Center');
      expect(message).toContain('Only CG Centers');
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
      (component as any).fieldsManagerSE = { isContributorsPartners2026: () => isCP2026, isP25: () => true };
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
        { provide: CentersService, useValue: { centersList: CENTERS_CATALOG, centers: signal(CENTERS_CATALOG) } },
        { provide: ResultLevelService, useValue: {} },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => true, isP25: () => true } }
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

  it('keeps Other sentinel, manual and persisted items while pruning stale preloaded SP', () => {
    svc.tocReferenceSynergyInitiativeIds.set([1]);
    flush();
    // persisted (no `new`) + Other sentinel appear alongside the preloaded SP01
    svc.scienceSelected = [...svc.scienceSelected, { id: 99, official_code: 'SP99' }, { id: component.OTHER_SP_CODE }];

    svc.tocReferenceSynergyInitiativeIds.set([7]);
    flush();
    const ids = svc.scienceSelected.map((sp: any) => sp.id);
    expect(ids).not.toContain(1); // stale preloaded pruned
    expect(ids).toContain(99); // persisted survives
    expect(ids).toContain(component.OTHER_SP_CODE); // sentinel survives
    expect(ids).toContain(7); // new node preselected
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
        GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    // The CLARISA catalogue has NOT resolved yet when the component is created — mirrors the real
    // startup sequence and the P2-3190 fixture pattern in rd-contributors-and-partners.zoneless.spec.ts.
    centersMock = { loadedCenters: new BehaviorSubject<boolean>(false), centersList: CENTERS_CATALOG, centers: signal(CENTERS_CATALOG) };

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
        GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: SCIENCE_CATALOG })),
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    const centersMock = { loadedCenters: new BehaviorSubject<boolean>(true), centersList: CENTERS_CATALOG, centers: signal(CENTERS_CATALOG) };

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
          useValue: { isContributorsPartners2026: () => true, isP25: () => true, activeIndicatorsLength: () => 0, hasSelectedIndicator: () => false }
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
