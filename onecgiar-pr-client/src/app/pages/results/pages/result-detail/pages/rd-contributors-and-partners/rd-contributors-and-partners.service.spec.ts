import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { RdContributorsAndPartnersService } from './rd-contributors-and-partners.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { ContributorsAndPartnersBody } from './models/contributorsAndPartnersBody';

describe('RdContributorsAndPartnersService', () => {
  let service: RdContributorsAndPartnersService;
  let mockApi: { resultsSE: { GET_ContributorsPartners: jest.Mock } };
  let mockInstitutionsSE: {
    institutionsList: { institutions_id: number; full_name: string }[];
    institutionsWithoutCentersList: { institutions_id: number }[];
    loadedInstitutions: Subject<boolean>;
  };
  let mockCentersSE: {
    centersList: { code: string; full_name: string }[];
    loadedCenters: Subject<boolean>;
  };

  beforeEach(() => {
    mockApi = {
      resultsSE: {
        GET_ContributorsPartners: jest.fn().mockReturnValue(of({ response: {} }))
      }
    };
    mockInstitutionsSE = {
      institutionsList: [
        { institutions_id: 10, full_name: 'Partner A' },
        { institutions_id: 20, full_name: 'Partner B' }
      ],
      institutionsWithoutCentersList: [{ institutions_id: 10 }, { institutions_id: 20 }],
      loadedInstitutions: new Subject<boolean>()
    };
    mockCentersSE = {
      // LC-T-1: 3+ centers so a full-catalog possibleLeadCenters.length and a Contributing-Centers-union
      // length are distinguishable — a 1-2 element catalog would let a stale `.length === 1` check pass
      // by coincidence instead of proving the relocation onto the Contributing Centers union (LC-DD-2).
      centersList: [
        { code: 'C1', full_name: 'Center One' },
        { code: 'C2', full_name: 'Center Two' },
        { code: 'C3', full_name: 'Center Three' }
      ],
      loadedCenters: new Subject<boolean>()
    };

    TestBed.configureTestingModule({
      providers: [
        RdContributorsAndPartnersService,
        { provide: ApiService, useValue: mockApi },
        { provide: InstitutionsService, useValue: mockInstitutionsSE },
        { provide: CentersService, useValue: mockCentersSE },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => false } }
      ]
    });

    service = TestBed.inject(RdContributorsAndPartnersService);
    service.partnersBody = new ContributorsAndPartnersBody();
  });

  /**
   * The skeleton reuses `getConsumed` rather than adding a second flag: it already means "the
   * section GET came back", it is reset by `resetState()` (which the component calls on entry, so
   * the root singleton does not leak across results) and it is set on BOTH next and error.
   */
  describe('sectionLoading (skeleton)', () => {
    it('is raised while the section GET has not come back', () => {
      service.resetState();

      expect(service.sectionLoading()).toBe(true);
    });

    it('mirrors getConsumed — the flag the section GET already sets on both next and error', () => {
      service.resetState();
      expect(service.sectionLoading()).toBe(true);

      service.getConsumed.set(true);

      expect(service.sectionLoading()).toBe(false);
    });

    it('is released when the section GET fails, so the skeleton can never get stuck', () => {
      service.resetState();
      mockApi.resultsSE.GET_ContributorsPartners.mockReturnValue(throwError(() => new Error('boom')));

      service.getSectionInformation();

      expect(service.sectionLoading()).toBe(false);
    });
  });

  describe('tryAutoAssignLeadCenter', () => {
    beforeEach(() => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' } as any];
      service.setPossibleLeadCenters(false, false);
    });

    it('should assign leadCenterCode when one center and center-led', () => {
      service.leadCenterCode = null;
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBe('C1');
    });

    it('should not assign when two contributing centers', () => {
      service.partnersBody.contributing_center.push({ code: 'C2', name: 'Center Two' } as any);
      service.setPossibleLeadCenters(false, false);
      service.leadCenterCode = null;
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBeNull();
    });

    it('should not overwrite a valid existing lead center', () => {
      service.leadCenterCode = 'C1';
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBe('C1');
    });

    it('should re-assign when lead center is no longer in possible list', () => {
      service.leadCenterCode = 'C99';
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBe('C1');
    });

    /**
     * LCD-T-4 (docs/specs/changes/lead-center-decouple, LCD-DD-2): inverted from the old "should
     * skip when led by partner" — that assertion WAS the exclusivity rule this spec removes.
     * `tryAutoAssignLeadCenter`'s `if (is_lead_by_partner) return;` guard is gone, so Lead Center
     * auto-assign now runs regardless of the toggle.
     */
    it('LCD-AC-4/LCD-DD-2: auto-assigns even when led by partner — the toggle no longer gates Lead Center auto-assign', () => {
      service.partnersBody.is_lead_by_partner = true;
      service.leadCenterCode = null;
      service.tryAutoAssignLeadCenter();
      expect(service.leadCenterCode).toBe('C1');
    });
  });

  describe('tryAutoAssignLeadPartner', () => {
    beforeEach(() => {
      service.partnersBody.is_lead_by_partner = true;
      service.partnersBody.institutions = [{ institutions_id: 10 } as any];
      service.setPossibleLeadPartners(false, false);
    });

    it('should assign leadPartnerId when one partner and partner-led', () => {
      service.leadPartnerId = null;
      service.tryAutoAssignLeadPartner();
      expect(service.leadPartnerId).toBe(10);
    });

    it('should not assign when two partners', () => {
      service.partnersBody.institutions.push({ institutions_id: 20 } as any);
      service.setPossibleLeadPartners(false, false);
      service.leadPartnerId = null;
      service.tryAutoAssignLeadPartner();
      expect(service.leadPartnerId).toBeNull();
    });

    it('should skip when not led by partner', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.leadPartnerId = null;
      service.tryAutoAssignLeadPartner();
      expect(service.leadPartnerId).toBeNull();
    });
  });

  describe('onLeadByPartnerChange', () => {
    it('should auto-assign lead center when switching to center-led with one center', () => {
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' } as any];
      service.partnersBody.is_lead_by_partner = true;
      service.leadPartnerId = 10;
      service.partnersBody.institutions = [{ institutions_id: 10 } as any];

      service.onLeadByPartnerChange(false);

      expect(service.leadPartnerId).toBeNull();
      expect(service.leadCenterCode).toBe('C1');
    });

    /**
     * LCD-T-4 (docs/specs/changes/lead-center-decouple, LCD-AC-4/LCD-DD-2): the old assertion
     * expected `leadCenterCode` to become `null` here — that WAS the mutual-exclusivity rule this
     * spec reverses. `onLeadByPartnerChange`'s `leadCenterCode = null` line in the `isPartnerLed`
     * branch was removed, so a previously-set Lead Center now survives a toggle flip to "Yes".
     * Lead Partner's own auto-assign is unaffected and still fires.
     */
    it('LCD-AC-4: switching to partner-led PRESERVES leadCenterCode (no longer nulled) and still auto-assigns lead partner', () => {
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' } as any];
      service.partnersBody.institutions = [{ institutions_id: 10 } as any];
      service.partnersBody.is_lead_by_partner = false;
      service.leadCenterCode = 'C1';

      service.onLeadByPartnerChange(true);

      expect(service.leadCenterCode).toBe('C1');
      expect(service.leadPartnerId).toBe(10);
    });

    it('LCD-AC-4 (isolated): a previously-set leadCenterCode survives the toggle even with 2 centers, where auto-assign cannot mask the fix', () => {
      service.partnersBody.contributing_center = [
        { code: 'C1', name: 'Center One' } as any,
        { code: 'C2', name: 'Center Two' } as any
      ];
      service.partnersBody.institutions = [];
      service.partnersBody.is_lead_by_partner = false;
      service.leadCenterCode = 'C1';

      service.onLeadByPartnerChange(true);

      expect(service.leadCenterCode).toBe('C1');
    });
  });

  describe('setPossibleLeadCenters auto-assign', () => {
    it('should auto-assign after rebuild when one center remains', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' } as any];
      service.leadCenterCode = null;

      service.setPossibleLeadCenters(false, true);

      expect(service.leadCenterCode).toBe('C1');
    });
  });

  // P2-3115: the ToC prefill must never resurrect a deliberately-emptied, saved selection.
  // These cover the mechanism's foundation (the hydration flag lifecycle). The effect-level guard behavior
  // (cold-load stays empty vs. user-driven selection prefills) is exercised end-to-end in the browser.
  describe('P2-3115 — ToC prefill resurrection guards', () => {
    const set2026 = (value: boolean) => jest.spyOn((service as any).fieldsManagerSE, 'isContributorsPartners2026').mockReturnValue(value);

    it('starts with both prefill guards false', () => {
      expect(service.sectionHydratedFromToc()).toBe(false);
      expect(service.tocSelectionTouched()).toBe(false);
    });

    it('applyTocMappingOnLoad marks the section hydrated in 2026 (persisted state becomes authoritative)', () => {
      set2026(true);
      service.applyTocMappingOnLoad();
      expect(service.sectionHydratedFromToc()).toBe(true);
    });

    it('applyTocMappingOnLoad leaves the guard untouched in the 2025 legacy path', () => {
      set2026(false);
      service.applyTocMappingOnLoad();
      expect(service.sectionHydratedFromToc()).toBe(false);
    });

    it('resetState clears both guards so state does not leak across results', () => {
      service.sectionHydratedFromToc.set(true);
      service.tocSelectionTouched.set(true);
      service.resetState();
      expect(service.sectionHydratedFromToc()).toBe(false);
      expect(service.tocSelectionTouched()).toBe(false);
    });
  });

  describe('P2-3001 — W3/Bilateral projects by Science Program (2026)', () => {
    const set2026 = (value: boolean) => jest.spyOn((service as any).fieldsManagerSE, 'isContributorsPartners2026').mockReturnValue(value);

    const spProjects = [
      { project_id: '8', project_name: 'Project 8' },
      { project_id: '9', project_name: 'Project 9' }
    ];

    beforeEach(() => {
      (mockApi.resultsSE as any).GET_W3BilateralProjectsByProgram = jest.fn().mockReturnValue(of({ response: spProjects }));
      (mockApi.resultsSE as any).GET_W3BilateralProjects = jest.fn().mockReturnValue(of({ response: [] }));
      (mockApi as any).dataControlSE = { currentResult: null, currentResultSignal: () => null };
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    const setPrimaryInit = (officialCode: string | null) => {
      service.partnersBody.contributing_and_primary_initiative = [{ id: 50, official_code: officialCode }] as any;
      service.partnersBody.result_toc_result = { initiative_id: 50, result_toc_results: [] } as any;
    };

    it('2026: loads the full SP list via by-program with the primary initiative official code', () => {
      set2026(true);
      setPrimaryInit('SP01');

      service.loadFilteredBilateralProjects();

      expect((mockApi.resultsSE as any).GET_W3BilateralProjectsByProgram).toHaveBeenCalledWith('SP01');
      expect(service.clarisaProjectsList.map(p => p.fullName)).toEqual(['Project 8', 'Project 9']);
      expect(service.hasTocResultMapped()).toBe(true);
      expect(service.loadingBilateralProjects()).toBe(false);
    });

    it('2026: falls back to dataControlSE.currentResult.initiative_official_code when there is no primary initiative match', () => {
      set2026(true);
      service.partnersBody.contributing_and_primary_initiative = [] as any;
      service.partnersBody.result_toc_result = { initiative_id: 50, result_toc_results: [] } as any;
      (mockApi as any).dataControlSE = { currentResult: { initiative_official_code: 'SP02' }, currentResultSignal: () => null };

      service.loadFilteredBilateralProjects();

      expect((mockApi.resultsSE as any).GET_W3BilateralProjectsByProgram).toHaveBeenCalledWith('SP02');
    });

    it('2026: unresolvable programId degrades to an empty list without calling the API', () => {
      set2026(true);
      service.partnersBody.contributing_and_primary_initiative = [] as any;
      service.partnersBody.result_toc_result = { initiative_id: 50, result_toc_results: [] } as any;

      service.loadFilteredBilateralProjects();

      expect((mockApi.resultsSE as any).GET_W3BilateralProjectsByProgram).not.toHaveBeenCalled();
      expect(service.clarisaProjectsList).toEqual([]);
      expect(service.loadingBilateralProjects()).toBe(false);
    });

    it('2026: tocResultChanged is a no-op once loaded — no refetch and the user selection survives', () => {
      set2026(true);
      setPrimaryInit('SP01');
      service.loadFilteredBilateralProjects();
      service.partnersBody.bilateral_projects = [{ project_id: '8' }] as any;

      service.loadFilteredBilateralProjects(true); // template handler: (tocResultChanged) → loadFilteredBilateralProjects(true)

      expect((mockApi.resultsSE as any).GET_W3BilateralProjectsByProgram).toHaveBeenCalledTimes(1);
      expect(service.partnersBody.bilateral_projects).toEqual([{ project_id: '8' }]);
    });

    it('2025: keeps the legacy per-tocResultId fan-out with dedup and clearSelection', () => {
      set2026(false);
      (mockApi.resultsSE as any).GET_W3BilateralProjects = jest
        .fn()
        .mockReturnValueOnce(of({ response: [{ project_id: '1', project_name: 'P1' }] }))
        .mockReturnValueOnce(of({ response: [{ project_id: '1', project_name: 'P1' }, { project_id: '2', project_name: 'P2' }] }));
      service.partnersBody.result_toc_result = { result_toc_results: [{ toc_result_id: 101 }, { toc_result_id: 102 }] } as any;
      service.partnersBody.bilateral_projects = [{ project_id: '9' }] as any;

      service.loadFilteredBilateralProjects(true);

      expect((mockApi.resultsSE as any).GET_W3BilateralProjects).toHaveBeenCalledTimes(2);
      expect((mockApi.resultsSE as any).GET_W3BilateralProjectsByProgram).not.toHaveBeenCalled();
      expect(service.partnersBody.bilateral_projects).toEqual([]);
      expect(service.clarisaProjectsList.map(p => p.project_id)).toEqual(['1', '2']);
    });
  });

  /**
   * docs/specs/bugfix/lead-center-full-catalog LC-T-1 (LC-DD-1): possibleLeadCenters is ALWAYS the full
   * CLARISA centers catalog now, independent of Contributing CGIAR Centers (contributing_center /
   * otherCentersSelected) state. Before the fix, `setPossibleLeadCenters` only rebuilt the list when one of
   * those two was non-empty, so a fresh/ToC-less result (both empty) left the required Lead center dropdown
   * empty ("There are no items available for this list") and blocked save — LC-TEST-1 is the regression test
   * for exactly that case; it must fail against the pre-fix code (guarded on `contributing_center?.length > -1
   * || otherCentersSelected?.length > 0`, which is false when both are empty, leaving possibleLeadCenters at
   * its initial `[]`).
   */
  describe('setPossibleLeadCenters — full catalog, independent of Contributing Centers (LC-DD-1)', () => {
    const fullCatalogCodes = ['C1', 'C2', 'C3'];

    it('LC-TEST-1: equals the full mapped catalog when contributing_center and otherCentersSelected are both empty (regression)', () => {
      service.partnersBody.contributing_center = [];
      service.otherCentersSelected = [];

      service.setPossibleLeadCenters(false, false);

      expect(service.possibleLeadCenters.map(c => c.code)).toEqual(fullCatalogCodes);
      expect(service.possibleLeadCenters.every(c => c.selected === false && c.disabled === false)).toBe(true);
    });

    it('LC-TEST-2: still equals the full catalog (not a subset) when Contributing Centers has entries', () => {
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' }] as any;
      service.otherCentersSelected = [{ code: 'C2' }] as any;

      service.setPossibleLeadCenters(false, false);

      expect(service.possibleLeadCenters.map(c => c.code)).toEqual(fullCatalogCodes);
    });

    it('rebuilds the same full catalog even when contributing_center has not been hydrated yet (undefined)', () => {
      service.partnersBody.contributing_center = undefined as any;
      service.otherCentersSelected = [];

      service.setPossibleLeadCenters(false, false);

      expect(service.possibleLeadCenters.map(c => c.code)).toEqual(fullCatalogCodes);
    });

    it('LC-TEST-3: leadCenterCode is not cleared by adding/removing a Contributing Center, as long as it stays in the catalog', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' }] as any;
      service.leadCenterCode = 'C3'; // valid catalog center, unrelated to the Contributing Centers selection

      // Add a Contributing Center.
      service.partnersBody.contributing_center.push({ code: 'C2', name: 'Center Two' } as any);
      service.setPossibleLeadCenters(false, true);
      expect(service.leadCenterCode).toBe('C3');

      // Remove one back down to a single Contributing Center.
      service.partnersBody.contributing_center = [{ code: 'C2', name: 'Center Two' }] as any;
      service.setPossibleLeadCenters(false, true);
      expect(service.leadCenterCode).toBe('C3');

      // Remove the rest — Contributing Centers is now empty.
      service.partnersBody.contributing_center = [];
      service.setPossibleLeadCenters(false, true);
      expect(service.leadCenterCode).toBe('C3');
    });
  });

  /**
   * LC-DD-2: tryAutoAssignLeadCenter's single-center convenience is relocated off `possibleLeadCenters.length`
   * (now always the full 3-center catalog) onto the de-duplicated union of `partnersBody.contributing_center`
   * and `otherCentersSelected`, by `code`.
   */
  describe('tryAutoAssignLeadCenter — relocated onto the Contributing Centers union (LC-DD-2)', () => {
    it('LC-TEST-4a: auto-assigns when exactly one Contributing Center is selected via the ToC/manual dropdown', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' }] as any;
      service.otherCentersSelected = [];
      service.leadCenterCode = null;

      service.setPossibleLeadCenters(false, true);

      expect(service.leadCenterCode).toBe('C1');
    });

    it('LC-TEST-4b: auto-assigns when the single eligible center comes only from the "Other(s)" dropdown', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [];
      service.otherCentersSelected = [{ code: 'C2' }] as any;
      service.leadCenterCode = null;

      service.setPossibleLeadCenters(false, true);

      expect(service.leadCenterCode).toBe('C2');
    });

    it('LC-TEST-4c: the same center in both dropdowns still counts as one (de-duplicated by code) and auto-assigns', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' }] as any;
      service.otherCentersSelected = [{ code: 'C1' }] as any;
      service.leadCenterCode = null;

      service.setPossibleLeadCenters(false, true);

      expect(service.leadCenterCode).toBe('C1');
    });

    it('LC-TEST-5: does NOT auto-assign when two or more distinct Contributing Centers are selected', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' }] as any;
      service.otherCentersSelected = [{ code: 'C2' }] as any;
      service.leadCenterCode = null;

      service.setPossibleLeadCenters(false, true);

      expect(service.leadCenterCode).toBeNull();
    });

    it('does not auto-assign when Contributing Centers is empty, even though the full catalog has 3 entries', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [];
      service.otherCentersSelected = [];
      service.leadCenterCode = null;

      service.setPossibleLeadCenters(false, true);

      expect(service.leadCenterCode).toBeNull();
    });
  });

  /**
   * docs/specs/bugfix/lead-center-full-catalog LC-T-5 (LC-DD-5, supersedes LC-DD-4's targeting rule):
   * `onLeadCenterSelected` now fires whenever the picked code is NOT already a Contributing Center —
   * regardless of union size — and targets `contributing_center` directly in the flat/unmapped UI, or
   * `otherCentersSelected` (+ the "Other(s)" sentinel) in the CP2026 + ToC-mapped split UI.
   *
   * The default `FieldsManagerService` mock in this file (`isContributorsPartners2026: () => false`)
   * means `isUnmappedOrFlat()` is TRUE by default — so the first block below (no override) exercises the
   * flat/unmapped target field (LC-AC-8), and the CP2026-mapped block explicitly overrides the mock.
   */
  describe('onLeadCenterSelected — target field by active UI + generalized trigger (LC-DD-5, supersedes LC-DD-4)', () => {
    const setMapped2026 = () => {
      jest.spyOn((service as any).fieldsManagerSE, 'isContributorsPartners2026').mockReturnValue(true);
      service.partnersBody.result_toc_result = { planned_result: true } as any;
    };

    it('LC-TEST-11: flat/unmapped, 0 Contributing Centers — selecting a Lead Center adds it directly to contributing_center, no sentinel (regression: pre-LC-T-5 code always targeted otherCentersSelected)', () => {
      service.partnersBody.contributing_center = [];
      service.otherCentersSelected = [];

      service.onLeadCenterSelected('C1');

      expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1']);
      expect(service.otherCentersSelected).toEqual([]);
      expect(service.autoAddedLeadCenterCode).toBe('C1');
    });

    it('flat/unmapped: swapping to a different Lead Center replaces the auto-added entry (no accumulation)', () => {
      service.partnersBody.contributing_center = [];
      service.otherCentersSelected = [];
      service.onLeadCenterSelected('C1');

      service.onLeadCenterSelected('C2');

      expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C2']);
      expect(service.autoAddedLeadCenterCode).toBe('C2');
    });

    it('flat/unmapped: clearing the Lead Center (falsy code) while auto-added removes the entry and leaves Contributing Centers empty', () => {
      service.partnersBody.contributing_center = [];
      service.otherCentersSelected = [];
      service.onLeadCenterSelected('C1');

      service.onLeadCenterSelected(null);

      expect(service.partnersBody.contributing_center).toEqual([]);
      expect(service.autoAddedLeadCenterCode).toBeNull();
    });

    it("LC-R-14 generalized trigger: auto-adds a NEW code even when Contributing Centers already has 2+ entries (no longer a no-op — that restriction was LC-DD-4's, superseded by LC-DD-5)", () => {
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' }] as any;
      service.otherCentersSelected = [{ code: 'C2' }] as any;

      service.onLeadCenterSelected('C3');

      expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1', 'C3']);
      expect(service.otherCentersSelected.map(c => c.code)).toEqual(['C2']); // untouched — only the auto-added entry is ever touched
      expect(service.autoAddedLeadCenterCode).toBe('C3');
    });

    it('LC-R-14 generalized trigger: auto-adds even when Contributing Centers has a single real (non-auto-added) entry', () => {
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' }] as any;
      service.otherCentersSelected = [];

      service.onLeadCenterSelected('C3');

      expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1', 'C3']);
      expect(service.otherCentersSelected).toEqual([]);
      expect(service.autoAddedLeadCenterCode).toBe('C3');
    });

    it('LC-TEST-15: no-op when the selected Lead Center is already in the Contributing Centers union', () => {
      service.partnersBody.contributing_center = [{ code: 'C1', name: 'Center One' }] as any;
      service.otherCentersSelected = [{ code: 'C2' }] as any;

      service.onLeadCenterSelected('C2');

      expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['C1']);
      expect(service.otherCentersSelected.map(c => c.code)).toEqual(['C2']);
      expect(service.autoAddedLeadCenterCode).toBeNull();
    });

    it('ignores a code that is not in the CLARISA catalog', () => {
      service.partnersBody.contributing_center = [];
      service.otherCentersSelected = [];

      service.onLeadCenterSelected('UNKNOWN');

      expect(service.partnersBody.contributing_center).toEqual([]);
      expect(service.otherCentersSelected).toEqual([]);
      expect(service.autoAddedLeadCenterCode).toBeNull();
    });

    it('resetState clears a tracked auto-added Lead Center so it does not leak into the next result', () => {
      service.partnersBody.contributing_center = [];
      service.otherCentersSelected = [];
      service.onLeadCenterSelected('C1');
      expect(service.autoAddedLeadCenterCode).toBe('C1');

      service.resetState();

      expect(service.autoAddedLeadCenterCode).toBeNull();
    });

    describe('CP2026 + ToC-mapped — target is otherCentersSelected + sentinel (LC-AC-9)', () => {
      it('LC-TEST-12: ToC brought a real reference center already in contributing_center; picking a Lead Center NOT among them adds it to otherCentersSelected and the sentinel to contributing_center', () => {
        setMapped2026();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center' }] as any;
        service.otherCentersSelected = [];

        service.onLeadCenterSelected('C1');

        expect(service.otherCentersSelected.map(c => c.code)).toEqual(['C1']);
        expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['TOC1', service.OTHER_CENTERS_CODE]);
        expect(service.autoAddedLeadCenterCode).toBe('C1');
      });

      it('LC-TEST-13: the sentinel was already present (user had manually checked "Other(s)") — auto-add does not claim ownership of it', () => {
        setMapped2026();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center' }, (service as any).buildOtherCentersSentinel()] as any;
        service.otherCentersSelected = [{ code: 'MANUAL1', name: 'Manual center' }] as any;

        service.onLeadCenterSelected('C1');

        expect(service.otherCentersSelected.map((c: any) => c.code)).toEqual(['MANUAL1', 'C1']);
        expect(service.partnersBody.contributing_center.filter((c: any) => c.code === service.OTHER_CENTERS_CODE).length).toBe(1);
        expect(service.autoAddedLeadCenterCode).toBe('C1');
      });

      it('LC-TEST-14: swap removes ONLY the auto-added entry — real ToC-derived centers untouched; the auto-added sentinel is removed and re-added around the swap', () => {
        setMapped2026();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center' }] as any;
        service.otherCentersSelected = [];
        service.onLeadCenterSelected('C1');
        expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['TOC1', service.OTHER_CENTERS_CODE]);

        service.onLeadCenterSelected('C2');

        expect(service.otherCentersSelected.map(c => c.code)).toEqual(['C2']);
        expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['TOC1', service.OTHER_CENTERS_CODE]);
        expect(service.autoAddedLeadCenterCode).toBe('C2');
      });

      it('LC-TEST-14b: when the auto-added entry is the only otherCentersSelected item and its sentinel was auto-added, clearing the Lead Center removes both the entry and the sentinel', () => {
        setMapped2026();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center' }] as any;
        service.otherCentersSelected = [];
        service.onLeadCenterSelected('C1');

        service.onLeadCenterSelected(null);

        expect(service.otherCentersSelected).toEqual([]);
        expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['TOC1']);
        expect(service.autoAddedLeadCenterCode).toBeNull();
      });

      it('LC-TEST-14c: when the sentinel was checked manually (not auto-added), removing the auto-added entry leaves the sentinel in place', () => {
        setMapped2026();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center' }, (service as any).buildOtherCentersSentinel()] as any;
        service.otherCentersSelected = [];
        service.onLeadCenterSelected('C1'); // sentinel already present → _autoAddedSentinel stays false
        expect(service.otherCentersSelected.map((c: any) => c.code)).toEqual(['C1']);

        service.onLeadCenterSelected(null);

        expect(service.otherCentersSelected).toEqual([]);
        expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['TOC1', service.OTHER_CENTERS_CODE]);
      });
    });
  });

  /**
   * docs/specs/bugfix/lead-center-full-catalog LC-T-5 (LC-DD-5): pre-existing bug, not introduced by this
   * spec — `applyTocMappingOnLoad` re-added the "Other(s)" sentinel whenever there were Other(s) centers,
   * regardless of whether any real ToC-derived centers existed to justify the split view. Fixed to only
   * add the sentinel for the genuine "mixed" case.
   */
  describe('applyTocMappingOnLoad — sentinel reconciliation fix (LC-DD-5)', () => {
    const set2026 = () => jest.spyOn((service as any).fieldsManagerSE, 'isContributorsPartners2026').mockReturnValue(true);

    it('tocCenters.length === 0 && otherCenters.length > 0: no sentinel is added, contributing_center is empty', () => {
      set2026();
      service.partnersBody.contributing_center = [
        { code: 'O1', from_toc: false },
        { code: 'O2', from_toc: false }
      ] as any;

      service.applyTocMappingOnLoad();

      expect(service.otherCentersSelected.map((c: any) => c.code)).toEqual(['O1', 'O2']);
      expect(service.partnersBody.contributing_center).toEqual([]);
    });

    it('tocCenters.length > 0 && otherCenters.length > 0: sentinel is added (genuine mixed case, unchanged)', () => {
      set2026();
      service.partnersBody.contributing_center = [
        { code: 'T1', from_toc: true },
        { code: 'O1', from_toc: false }
      ] as any;

      service.applyTocMappingOnLoad();

      expect(service.otherCentersSelected.map((c: any) => c.code)).toEqual(['O1']);
      expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['T1', service.OTHER_CENTERS_CODE]);
    });

    it('otherCenters.length === 0: unchanged existing behavior — contributing_center is just the ToC centers, no sentinel', () => {
      set2026();
      service.partnersBody.contributing_center = [
        { code: 'T1', from_toc: true },
        { code: 'T2', from_toc: true }
      ] as any;

      service.applyTocMappingOnLoad();

      expect(service.otherCentersSelected).toEqual([]);
      expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['T1', 'T2']);
    });
  });
});
