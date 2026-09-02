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
import { QaInnovationDevelopmentResultsService } from '../../../../../../shared/services/global/qa-innovation-development-results.service';

/**
 * P2-3420 / P2-3421 — the link to a QA'd Innovation Development result, as it lives in the FULL
 * editing form (Contributors and partners), where the story asks for it to be visible and editable
 * after the result has been saved.
 *
 * The four things that can silently go wrong, one test each:
 * 1. The gate. Innovation use + phase 2026 onwards, and NEVER a portfolio check: prtest keeps
 *    2025-phase results inside P25, and those must keep the legacy multi-select.
 * 2. Single selection over an array payload — `linked_results` stays an array on the wire.
 * 3. A stored link whose innovation is no longer listed must NOT vanish from the select (saving the
 *    section would wipe it).
 * 4. Answering "No" clears the link, and only for this surface.
 */
describe('RdContributorsAndPartnersComponent — link to a QA’d Innovation Development result (P2-3420 / P2-3421)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let component: RdContributorsAndPartnersComponent;
  let currentResultSignal: any;
  let qaInnovationsSE: any;
  let partnersBody: any;

  const qaOption = (id: number, result_code: number, title: string) => ({
    id,
    result_code,
    title,
    status_id: 2,
    phase_year: 2026,
    acronym: 'P25',
    display: `${result_code} - ${title}`
  });

  beforeEach(async () => {
    currentResultSignal = signal<any>({ result_type_id: 2, phase_year: 2026, portfolio: 'P25' });
    partnersBody = { has_innovation_link: false, linked_results: [] };
    qaInnovationsSE = {
      options: signal([qaOption(9053, 6772, 'Test Geo1'), qaOption(8779, 6508, 'In QA')]),
      loading: signal(false),
      loaded: signal(false),
      isEmpty: signal(false),
      load: jest.fn()
    };

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
              GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] }))
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
        { provide: QaInnovationDevelopmentResultsService, useValue: qaInnovationsSE },
        { provide: ChangeDetectorRef, useValue: { detectChanges: jest.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    component = fixture.componentInstance;
  });

  describe('the gate', () => {
    it('is on for an Innovation use result in the 2026 phase', () => {
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

    // The effect's body is asserted directly (`ensureQaInnovationCatalogue`): rendering this section
    // just to flush one effect would drag in the whole ToC/centres mock tree for nothing.
    it('fetches the catalogue only for the surface that uses it', () => {
      currentResultSignal.set({ result_type_id: 7, phase_year: 2026, portfolio: 'P25' });
      component.ensureQaInnovationCatalogue();
      expect(qaInnovationsSE.load).not.toHaveBeenCalled();

      currentResultSignal.set({ result_type_id: 2, phase_year: 2026, portfolio: 'P25' });
      component.ensureQaInnovationCatalogue();
      expect(qaInnovationsSE.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('single selection over the array payload', () => {
    it('reads the stored id, whether it arrives as a number or as an object', () => {
      partnersBody.linked_results = [9053];
      expect(component.linkedInnovationId).toBe(9053);

      partnersBody.linked_results = [{ id: 8779 }];
      expect(component.linkedInnovationId).toBe(8779);
    });

    it('is null when nothing is linked', () => {
      partnersBody.linked_results = [];
      expect(component.linkedInnovationId).toBeNull();
    });

    it('writes one id back into the array the API expects', () => {
      component.linkedInnovationId = 9053;
      expect(partnersBody.linked_results).toEqual([9053]);
    });

    it('replaces the previous selection instead of adding to it (single-select)', () => {
      partnersBody.linked_results = [9053];
      component.linkedInnovationId = 8779;
      expect(partnersBody.linked_results).toEqual([8779]);
    });

    it('clears the array when the selection is removed', () => {
      partnersBody.linked_results = [9053];
      component.linkedInnovationId = null;
      expect(partnersBody.linked_results).toEqual([]);
    });
  });

  describe('the options offered', () => {
    it('offers the QA’d catalogue as it comes, with "[Result ID] - [Result Title]" labels', () => {
      expect(component.qaInnovationOptions.map(option => option.display)).toEqual(['6772 - Test Geo1', '6508 - In QA']);
    });

    it('keeps a stored link that is no longer listed, so saving the section cannot wipe it', () => {
      partnersBody.linked_results = [7777];
      (TestBed.inject(InnovationUseResultsService) as any).resultsList = [
        { name: 'Innovation development', options: [{ id: 7777, result_code: 5555, title: 'Discontinued innovation' }] }
      ];

      const [first, ...rest] = component.qaInnovationOptions;
      expect(first).toEqual(expect.objectContaining({ id: 7777, display: '5555 - Discontinued innovation' }));
      expect(rest).toHaveLength(2);
    });

    it('still keeps it when not even the wider catalogue knows its title', () => {
      partnersBody.linked_results = [7777];
      expect(component.qaInnovationOptions[0].display).toBe('7777 - (linked result outside the QA’d list)');
    });

    it('does not duplicate a stored link that IS listed', () => {
      partnersBody.linked_results = [9053];
      expect(component.qaInnovationOptions).toHaveLength(2);
    });
  });

  describe('answering "No"', () => {
    it('clears the linked result', () => {
      partnersBody.linked_results = [9053];
      partnersBody.has_innovation_link = false;
      component.onQaInnovationLinkChange();
      expect(partnersBody.linked_results).toEqual([]);
    });

    it('leaves the selection alone when the answer is "Yes"', () => {
      partnersBody.linked_results = [9053];
      partnersBody.has_innovation_link = true;
      component.onQaInnovationLinkChange();
      expect(partnersBody.linked_results).toEqual([9053]);
    });

    it('does not touch the other surfaces: Innovation development keeps its multi-selection', () => {
      currentResultSignal.set({ result_type_id: 7, phase_year: 2026, portfolio: 'P25' });
      partnersBody.linked_results = [9053, 8779];
      partnersBody.has_innovation_link = false;
      component.onQaInnovationLinkChange();
      expect(partnersBody.linked_results).toEqual([9053, 8779]);
    });
  });
});
