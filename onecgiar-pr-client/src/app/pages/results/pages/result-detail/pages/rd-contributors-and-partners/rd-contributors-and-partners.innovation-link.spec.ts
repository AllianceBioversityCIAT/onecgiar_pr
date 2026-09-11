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

/**
 * P2-3424 — the link to a QA'd Innovation Development result LEFT this section.
 *
 * PO decision (Ángel Jarrín, 10 Sep 2026): the question is shown in the Innovation Use section and is
 * not an MDS field. This suite is the half of that move that lives here, and it guards the two things
 * that can silently go wrong on this side:
 *
 * 1. The gate. Innovation use + phase 2026 onwards, and NEVER a portfolio check: prtest keeps
 *    2025-phase results inside P25, and those must keep asking the question HERE.
 * 2. The save contract. This section no longer asks the question, so it must no longer answer it —
 *    with the keys still in the payload, a "Yes" set in the Innovation Use section would come back as
 *    "No" on the next save from here and take the stored `linked_result` rows with it.
 *
 * The single-editing-surface invariant itself (the question renders in exactly one result-detail
 * template) is asserted statically in
 * `../rd-result-types-pages/innovation-use-info/innovation-link-editing-surface.spec.ts`.
 */
describe('RdContributorsAndPartnersComponent — the QA’d Innovation Development link left this section (P2-3424)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let component: RdContributorsAndPartnersComponent;
  let currentResultSignal: any;
  let partnersBody: any;
  let patchSpy: jest.Mock;

  beforeEach(async () => {
    currentResultSignal = signal<any>({ result_type_id: 2, phase_year: 2026, portfolio: 'P25' });
    partnersBody = {
      has_innovation_link: false,
      linked_results: [],
      // `onSaveSection` reads these unconditionally.
      institutions: [],
      mqap_institutions: [],
      contributing_center: [],
      contributing_initiatives: { pending_contributing_initiatives: [], accepted_contributing_initiatives: [] },
      no_applicable_partner: false,
      is_lead_by_partner: false
    };
    patchSpy = jest.fn().mockReturnValue(of({ response: {} }));

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ApiService,
          useValue: {
            dataControlSE: {
              currentResult: {},
              currentResultSignal,
              currentResultSectionName: signal(''),
              findClassTenSeconds: jest.fn().mockResolvedValue(true),
              isKnowledgeProduct: false
            },
            resultsSE: {
              // `ngOnInit` -> `GET_AllWithoutResults()` reads the result before listing initiatives.
              GET_resultById: jest.fn().mockReturnValue(of({ response: { portfolio: 'P25', result_type_id: 2, phase_year: 2026 } })),
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
            // Hydrated + untouched = the cold-load guard (P2-3115) returns early, so the ToC prefill
            // effect this section also runs stays out of the way of the one under test.
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

  describe('the gate', () => {
    it('is on for an Innovation use result in the 2026 phase — the question is asked elsewhere', () => {
      expect(component.showsQaInnovationLink()).toBe(true);
    });

    it('is OFF for a 2025-phase Innovation use result, even inside the P25 portfolio', () => {
      currentResultSignal.set({ result_type_id: 2, phase_year: 2025, portfolio: 'P25' });
      expect(component.showsQaInnovationLink()).toBe(false);
    });

    it('is OFF for Innovation development (result_type_id 7), which keeps the legacy multi-select', () => {
      currentResultSignal.set({ result_type_id: 7, phase_year: 2026, portfolio: 'P25' });
      expect(component.showsQaInnovationLink()).toBe(false);
    });

    it('is OFF while the phase year is unknown — the safe side to fail towards is the legacy control', () => {
      currentResultSignal.set({ result_type_id: 2, portfolio: 'P25' });
      expect(component.showsQaInnovationLink()).toBe(false);
    });
  });

  describe('the save contract', () => {
    const savedPayload = () => patchSpy.mock.calls[0][0];

    it('drops has_innovation_link AND linked_results when the question lives in the Innovation Use section', () => {
      partnersBody.has_innovation_link = false;
      partnersBody.linked_results = [];

      component.onSaveSection();

      expect(patchSpy).toHaveBeenCalledTimes(1);
      expect('has_innovation_link' in savedPayload()).toBe(false);
      expect('linked_results' in savedPayload()).toBe(false);
    });

    it('drops them even when the body still holds a stale answer read from this section’s GET', () => {
      // This is the wipe the omission prevents: the GET prefers `result.has_innovation_link`, which the
      // Innovation Use section never writes, so a "Yes" stored there arrives here as "No".
      partnersBody.has_innovation_link = false;
      partnersBody.linked_results = [];
      currentResultSignal.set({ result_type_id: 2, phase_year: 2026, portfolio: 'P25' });

      component.onSaveSection();

      expect('has_innovation_link' in savedPayload()).toBe(false);
      expect('linked_results' in savedPayload()).toBe(false);
    });

    it('still SENDS both keys for a 2025-phase Innovation use result — the question is still asked here', () => {
      currentResultSignal.set({ result_type_id: 2, phase_year: 2025, portfolio: 'P25' });
      partnersBody.has_innovation_link = true;
      partnersBody.linked_results = [{ id: '9053' }];

      component.onSaveSection();

      expect(savedPayload().has_innovation_link).toBe(true);
      expect(savedPayload().linked_results).toEqual([9053]);
    });

    it('still sends both keys for Innovation development, which keeps its multi-select here', () => {
      currentResultSignal.set({ result_type_id: 7, phase_year: 2026, portfolio: 'P25' });
      partnersBody.has_innovation_link = true;
      partnersBody.linked_results = [9053, 8779];

      component.onSaveSection();

      expect(savedPayload().has_innovation_link).toBe(true);
      expect(savedPayload().linked_results).toEqual([9053, 8779]);
    });
  });
});
