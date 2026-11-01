import { CommonModule } from '@angular/common';
import { TermPipe } from '../../../../../../internationalization/term.pipe';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of } from 'rxjs';
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
import { isP25ImpactResult } from '../../../../../../shared/utils/impact-result.util';

/**
 * @akili-spec results/impact-results-reporting/result-detail-impact IRD-T-5 (IRD-R-8 Scenarios 8.1 / 8.2, IRD-R-13).
 * Impact result (P25 + type 9): no ToC block, no generic linked-results block, link fields omitted from the PATCH.
 * Type 1 (policy change): DOM and PATCH body unchanged.
 */
describe('RdContributorsAndPartnersComponent — impact result without ToC (IRD-T-5)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let component: RdContributorsAndPartnersComponent;
  let currentResultSignal: any;
  let partnersBody: any;
  let patchSpy: jest.Mock;

  const build = (result: any) => {
    currentResultSignal.set(result);
    fixture.detectChanges();
  };
  const q = (testId: string) => (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
  const savedPayload = () => patchSpy.mock.calls[0][0];

  beforeEach(async () => {
    currentResultSignal = signal<any>({});
    partnersBody = {
      has_innovation_link: true,
      linked_results: [9053],
      institutions: [],
      mqap_institutions: [],
      contributing_center: [],
      contributing_initiatives: { pending_contributing_initiatives: [], accepted_contributing_initiatives: [] },
      no_applicable_partner: false,
      is_lead_by_partner: false,
      result_toc_result: { planned_result: null },
      contributing_and_primary_initiative: [],
      bilateral_projects: []
    };
    patchSpy = jest.fn().mockReturnValue(of({ response: {} }));

    await TestBed.configureTestingModule({
      imports: [CommonModule, TermPipe],
      declarations: [RdContributorsAndPartnersComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ApiService,
          useValue: {
            dataControlSE: {
              currentResult: {},
              currentResultSignal,
              isP25ImpactResultSignal: () => isP25ImpactResult(currentResultSignal()),
              currentResultSectionName: signal(''),
              findClassTenSeconds: jest.fn().mockResolvedValue(true),
              isKnowledgeProduct: false
            },
            rolesSE: { readOnly: false },
            resultsSE: {
              GET_resultById: jest.fn().mockReturnValue(of({ response: {} })),
              GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
              PATCH_ContributorsPartners: patchSpy
            }
          }
        },
        { provide: RolesService, useValue: {} },
        { provide: InstitutionsService, useValue: {} },
        { provide: CentersService, useValue: { getData: jest.fn().mockResolvedValue(true), centers: signal([]), centersList: [] } },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        {
          provide: RdContributorsAndPartnersService,
          useValue: {
            partnersBody,
            resetState: jest.fn(),
            getSectionInformation: jest.fn(),
            setPossibleLeadCenters: jest.fn(),
            loadFilteredBilateralProjects: jest.fn(),
            loadClarisaProjects: jest.fn(),
            getConsumed: signal(true),
            loadingBilateralProjects: signal(false),
            sectionLoading: signal(false),
            hasTocResultMapped: () => false,
            initiativeIdSignal: signal(null),
            possibleLeadCenters: [],
            possibleLeadPartners: [],
            cgspaceDisabledList: [],
            contributingInitiativeNew: [],
            leadPartnerId: null,
            leadCenterCode: null,
            updatingLeadData: false,
            otherCentersSelected: [],
            otherPartnersSelected: [],
            scienceSelected: [],
            otherScienceSelected: [],
            loadedAcceptedScienceIds: new Set<number>(),
            tocReferenceCenterInstitutionIds: signal<number[]>([]),
            tocReferenceSynergyInitiativeIds: signal<number[]>([]),
            loadedPendingScience: [],
            sectionHydratedFromToc: signal(true),
            tocSelectionTouched: signal(false)
          }
        },
        { provide: ResultLevelService, useValue: {} },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        { provide: FieldsManagerService, useValue: { isP25: () => true, isContributorsPartners2026: () => true, fields: signal({}) } },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jest.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    component = fixture.componentInstance;
  });

  describe('isImpactResult', () => {
    it('is true only for P25 + type 9', () => {
      currentResultSignal.set({ result_type_id: 9, portfolio: 'P25', phase_year: 2026 });
      expect(component.isImpactResult()).toBe(true);
      currentResultSignal.set({ result_type_id: 9, portfolio: 'P22', phase_year: 2026 });
      expect(component.isImpactResult()).toBe(false);
      currentResultSignal.set({ result_type_id: 1, portfolio: 'P25', phase_year: 2026 });
      expect(component.isImpactResult()).toBe(false);
    });
  });

  describe('type 9 (P25) — Scenario 8.1', () => {
    it('renders no ToC question and no linked-results control in the DOM, and shows the placeholder copy', () => {
      build({ result_type_id: 9, portfolio: 'P25', phase_year: 2026 });
      expect(q('cp-field-result_toc_result.planned_result')).toBeNull();
      expect(q('cp-field-has_innovation_link')).toBeNull();
      expect(q('cp-field-has_innovation_link~generic')).toBeNull();
      expect(q('cp-field-linked_results')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-cp-multiple-wps')).toBeNull();
      expect(q('cp-impact-copy')).not.toBeNull();
    });

    it('omits has_innovation_link and linked_results from the PATCH body', () => {
      currentResultSignal.set({ result_type_id: 9, portfolio: 'P25', phase_year: 2026 });
      component.onSaveSection();
      expect('has_innovation_link' in savedPayload()).toBe(false);
      expect('linked_results' in savedPayload()).toBe(false);
    });
  });

  describe('type 1 (P25) — Scenario 8.2: unchanged', () => {
    it('keeps the ToC question and the generic linked-results question, without the impact copy', () => {
      build({ result_type_id: 1, portfolio: 'P25', phase_year: 2026 });
      expect(q('cp-field-result_toc_result.planned_result')).not.toBeNull();
      expect(q('cp-field-has_innovation_link~generic')).not.toBeNull();
      expect(q('cp-impact-copy')).toBeNull();
    });

    it('still sends both link fields in the PATCH body', () => {
      currentResultSignal.set({ result_type_id: 1, portfolio: 'P25', phase_year: 2026 });
      component.onSaveSection();
      expect(savedPayload().has_innovation_link).toBe(true);
      expect(savedPayload().linked_results).toEqual([9053]);
    });
  });
});
