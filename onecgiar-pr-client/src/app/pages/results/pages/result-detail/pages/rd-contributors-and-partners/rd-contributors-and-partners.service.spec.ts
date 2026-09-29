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

  // P2-3427 (27-Sep-2026): the CLARISA catalogue can land AFTER the section GET (cold load, deep link). The
  // constructor's `loadedCenters` handler must then read the SAVED lead first and auto-assign LAST — the old
  // order auto-assigned and then `setLeadCenterOnLoad` overwrote the pick with `undefined` for a result saved
  // with ONE center and no `is_leading_result` (the IPSR defect the PO reported: "guardé, no pasó nada").
  describe('late catalogue — loadedCenters / loadedInstitutions keep the single-center lead (P2-3427)', () => {
    it('auto-assigns the only center when the catalogue arrives after the section (no saved lead)', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C2', name: 'Center Two', is_leading_result: false } as any];
      service.leadCenterCode = null;

      mockCentersSE.loadedCenters.next(true);

      expect(service.leadCenterCode).toBe('C2');
    });

    it('keeps the SAVED lead over the auto-assign when both exist', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [
        { code: 'C1', name: 'Center One', is_leading_result: false } as any,
        { code: 'C3', name: 'Center Three', is_leading_result: true } as any
      ];
      service.leadCenterCode = null;

      mockCentersSE.loadedCenters.next(true);

      expect(service.leadCenterCode).toBe('C3');
    });

    it('negative control: with two centers and no saved lead, nothing is auto-assigned', () => {
      service.partnersBody.is_lead_by_partner = false;
      service.partnersBody.contributing_center = [{ code: 'C1' } as any, { code: 'C2' } as any];
      service.leadCenterCode = null;

      mockCentersSE.loadedCenters.next(true);

      expect(service.leadCenterCode).toBeFalsy();
    });

    it('auto-assigns the only partner when the institutions catalogue arrives late and the lead is a partner', () => {
      service.partnersBody.is_lead_by_partner = true;
      service.partnersBody.institutions = [{ institutions_id: 10, is_leading_result: false } as any];
      service.partnersBody.mqap_institutions = [] as any;
      service.leadPartnerId = null;

      mockInstitutionsSE.loadedInstitutions.next(true);

      expect(service.leadPartnerId).toBe(10);
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
      // LC-DD-6 (bugfix): these scenarios model a genuine ToC/Other(s) split — the ToC DID bring a real
      // reference center (`TOC1`, institutionId 1 below) — so `hasNoTocReferenceCenters()` must read false
      // here, or `onLeadCenterSelected` falls into the (correct, for a DIFFERENT case) no-sentinel branch.
      const setToCBroughtReferenceCenters = () => service.tocReferenceCenterInstitutionIds.set([1]);

      it('LC-TEST-12: ToC brought a real reference center already in contributing_center; picking a Lead Center NOT among them adds it to otherCentersSelected and the sentinel to contributing_center', () => {
        setMapped2026();
        setToCBroughtReferenceCenters();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center', institutionId: 1 }] as any;
        service.otherCentersSelected = [];

        service.onLeadCenterSelected('C1');

        expect(service.otherCentersSelected.map(c => c.code)).toEqual(['C1']);
        expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['TOC1', service.OTHER_CENTERS_CODE]);
        expect(service.autoAddedLeadCenterCode).toBe('C1');
      });

      it('LC-TEST-13: the sentinel was already present (user had manually checked "Other(s)") — auto-add does not claim ownership of it', () => {
        setMapped2026();
        setToCBroughtReferenceCenters();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center', institutionId: 1 }, (service as any).buildOtherCentersSentinel()] as any;
        service.otherCentersSelected = [{ code: 'MANUAL1', name: 'Manual center' }] as any;

        service.onLeadCenterSelected('C1');

        expect(service.otherCentersSelected.map((c: any) => c.code)).toEqual(['MANUAL1', 'C1']);
        expect(service.partnersBody.contributing_center.filter((c: any) => c.code === service.OTHER_CENTERS_CODE).length).toBe(1);
        expect(service.autoAddedLeadCenterCode).toBe('C1');
      });

      it('LC-TEST-14: swap removes ONLY the auto-added entry — real ToC-derived centers untouched; the auto-added sentinel is removed and re-added around the swap', () => {
        setMapped2026();
        setToCBroughtReferenceCenters();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center', institutionId: 1 }] as any;
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
        setToCBroughtReferenceCenters();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center', institutionId: 1 }] as any;
        service.otherCentersSelected = [];
        service.onLeadCenterSelected('C1');

        service.onLeadCenterSelected(null);

        expect(service.otherCentersSelected).toEqual([]);
        expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['TOC1']);
        expect(service.autoAddedLeadCenterCode).toBeNull();
      });

      it('LC-TEST-14c: when the sentinel was checked manually (not auto-added), removing the auto-added entry leaves the sentinel in place', () => {
        setMapped2026();
        setToCBroughtReferenceCenters();
        service.partnersBody.contributing_center = [{ code: 'TOC1', name: 'ToC Center', institutionId: 1 }, (service as any).buildOtherCentersSentinel()] as any;
        service.otherCentersSelected = [];
        service.onLeadCenterSelected('C1'); // sentinel already present → _autoAddedSentinel stays false
        expect(service.otherCentersSelected.map((c: any) => c.code)).toEqual(['C1']);

        service.onLeadCenterSelected(null);

        expect(service.otherCentersSelected).toEqual([]);
        expect(service.partnersBody.contributing_center.map((c: any) => c.code)).toEqual(['TOC1', service.OTHER_CENTERS_CODE]);
      });
    });

    // LC-DD-6 (bugfix, 2026-09-11, result 9139): a MAPPED 2026 result whose ToC brought NO reference
    // centers (`tocReferenceCenterInstitutionIds` empty) is neither the flat/unmapped case nor the genuine
    // ToC/Other(s) split — dropdown 1 and the sentinel are never painted (`hasReferenceCenters()` false), so
    // the pick must land directly in `otherCentersSelected` with NO sentinel added to `contributing_center`.
    describe('CP2026 + mapped, but ToC brought NO reference centers — target is otherCentersSelected, no sentinel (LC-DD-6)', () => {
      it('adds the picked Lead Center directly to otherCentersSelected, without touching contributing_center or adding the sentinel', () => {
        setMapped2026(); // tocReferenceCenterInstitutionIds left at its default empty signal
        service.partnersBody.contributing_center = [];
        service.otherCentersSelected = [];

        service.onLeadCenterSelected('C1');

        expect(service.otherCentersSelected.map((c: any) => c.code)).toEqual(['C1']);
        expect(service.partnersBody.contributing_center).toEqual([]);
        expect(service.autoAddedLeadCenterCode).toBe('C1');
      });

      it('swapping to a different Lead Center replaces the auto-added entry, still with no sentinel', () => {
        setMapped2026();
        service.partnersBody.contributing_center = [];
        service.otherCentersSelected = [];
        service.onLeadCenterSelected('C1');

        service.onLeadCenterSelected('C2');

        expect(service.otherCentersSelected.map((c: any) => c.code)).toEqual(['C2']);
        expect(service.partnersBody.contributing_center).toEqual([]);
        expect(service.autoAddedLeadCenterCode).toBe('C2');
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

  /**
   * docs/specs/bugfix/external-partners-duplication EPD-T-2 (EPD-DD-1): an institution must never
   * exist in both the ToC-derived bucket (`partnersBody.institutions`) and the "Other(s)" bucket
   * (`otherPartnersSelected`) at once. `EPD-AC-1`'s exact repro shape — the same `institutions_id`
   * persisted twice, once `from_toc: true` and once `from_toc: false`.
   */
  describe('excludeInstitutionsIn (EPD-DD-1)', () => {
    it('drops items whose institutions_id is in the exclude set, keyed by id — not index or reference', () => {
      const list = [{ institutions_id: 1, full_name: 'One' }, { institutions_id: 2, full_name: 'Two' }, { institutions_id: 3, full_name: 'Three' }];
      const result = service.excludeInstitutionsIn(list, new Set([2]));
      expect(result.map((i: any) => i.institutions_id)).toEqual([1, 3]);
    });

    it('is a no-op when the exclude set is empty, and never mutates the source array', () => {
      const list = [{ institutions_id: 1 }, { institutions_id: 2 }];
      const result = service.excludeInstitutionsIn(list, new Set());
      expect(result).toEqual(list);
      expect(result).not.toBe(list);
    });

    it('handles an undefined/null list defensively', () => {
      expect(service.excludeInstitutionsIn(undefined as any, new Set([1]))).toEqual([]);
      expect(service.excludeInstitutionsIn(null as any, new Set([1]))).toEqual([]);
    });
  });

  describe('applyTocMappingOnLoad — never lets an institution live in both External Partner buckets (EPD-R-1/EPD-AC-1)', () => {
    const set2026 = () => jest.spyOn((service as any).fieldsManagerSE, 'isContributorsPartners2026').mockReturnValue(true);

    it('EPD-AC-1 falsifier: same institutions_id stored once from_toc: true and once from_toc: false — ends up in exactly one bucket', () => {
      set2026();
      service.partnersBody.institutions = [
        { institutions_id: 100, from_toc: true, full_name: 'Duplicated Partner (ToC copy)' },
        { institutions_id: 100, from_toc: false, full_name: 'Duplicated Partner (Other copy)' }
      ] as any;

      service.applyTocMappingOnLoad();

      const inToc = service.partnersBody.institutions.some((i: any) => i.institutions_id === 100);
      const inOther = service.otherPartnersSelected.some((i: any) => i.institutions_id === 100);
      // Exactly one of the two — never both, never neither.
      expect(inToc).toBe(true);
      expect(inOther).toBe(false);
      // The ToC-flagged copy is the one kept.
      expect(service.partnersBody.institutions.find((i: any) => i.institutions_id === 100)?.from_toc).toBe(true);
    });

    it('a legitimately different institution (no id collision) is never stripped', () => {
      set2026();
      service.partnersBody.institutions = [
        { institutions_id: 100, from_toc: true },
        { institutions_id: 200, from_toc: false }
      ] as any;

      service.applyTocMappingOnLoad();

      expect(service.partnersBody.institutions.map((i: any) => i.institutions_id)).toEqual([100, service.OTHER_PARTNERS_CODE]);
      expect(service.otherPartnersSelected.map((i: any) => i.institutions_id)).toEqual([200]);
    });

    it('no-op on already-clean input (no duplicates): both buckets keep exactly what they had', () => {
      set2026();
      service.partnersBody.institutions = [{ institutions_id: 100, from_toc: true }] as any;

      service.applyTocMappingOnLoad();

      expect(service.otherPartnersSelected).toEqual([]);
      expect(service.partnersBody.institutions.map((i: any) => i.institutions_id)).toEqual([100]);
    });
  });

  /**
   * docs/specs/bugfix/external-partners-duplication EPD-T-5 (EPD-AC-5): end-to-end regression for
   * the ORIGINAL repro shape reported on IPSR result 9657 — 6 distinct institutions, each one
   * persisted TWICE (once with `from_toc: true` in the ToC bucket, once with `from_toc: false` in
   * "Other(s)"), rendering as 12 selected partners for a result that only has 6. This is
   * deliberately distinct from the narrower `EPD-T-2` tests above (which use a single duplicated
   * institution) — it is the mandatory Bug Mode regression tying the fix to the reported symptom,
   * not another unit case for `excludeInstitutionsIn`.
   *
   * Falsifier (per EPD-T-5's own verification clause): the RAW combined count of everything the UI
   * would render across both buckets (`partnersBody.institutions` minus the non-renderable "Other(s)"
   * sentinel, plus `otherPartnersSelected`) must be exactly 6, never 12. Counting distinct ids would
   * pass even on the un-deduplicated (buggy) data — since it's the SAME 6 ids duplicated, not 6
   * different ones — so the assertion is on the raw combined length, which is exactly what renders
   * as chips.
   */
  describe('EPD-T-5 — end-to-end regression: original repro shape (6 institutions doubled → 12)', () => {
    const set2026 = () => jest.spyOn((service as any).fieldsManagerSE, 'isContributorsPartners2026').mockReturnValue(true);

    it('EPD-AC-5 falsifier: 6 institutions each present twice (ToC + Other) load into exactly 6 rendered partners, not 12', () => {
      set2026();
      const institutionIds = [901, 902, 903, 904, 905, 906];
      // Exact original repro shape: same institutions_id, once from_toc: true, once from_toc: false.
      service.partnersBody.institutions = institutionIds.flatMap(id => [
        { institutions_id: id, from_toc: true, full_name: `Partner ${id} (ToC copy)` },
        { institutions_id: id, from_toc: false, full_name: `Partner ${id} (Other copy)` }
      ]) as any;

      service.applyTocMappingOnLoad();

      const renderedToc = service.partnersBody.institutions.filter((i: any) => i.institutions_id !== service.OTHER_PARTNERS_CODE);
      const renderedOther = service.otherPartnersSelected;
      const combinedRendered = [...renderedToc, ...renderedOther];

      // The bug: pre-fix, all 6 ids appear in BOTH buckets (12 total). Post-fix: each id in exactly one bucket (6 total).
      expect(combinedRendered).toHaveLength(6);
      expect(combinedRendered.map((i: any) => i.institutions_id).sort((a: number, b: number) => a - b)).toEqual(institutionIds);
      // No institution renders in both buckets at once.
      const tocIds = new Set(renderedToc.map((i: any) => i.institutions_id));
      const otherIds = new Set(renderedOther.map((i: any) => i.institutions_id));
      const intersection = [...tocIds].filter(id => otherIds.has(id));
      expect(intersection).toEqual([]);
    });
  });

  /**
   * Live production bugfix (docs/specs/bugfix/external-partners-duplication follow-up, confirmed live on
   * prtest result 12125 / IPSR 9657): `applyTocMappingOnLoad()`'s External Partners reclassification was
   * extracted into its own public method, `reclassifyPartnersFromToc()`, so IPSR's own P25 load path
   * (`ipsr-contributors.component.ts#getTocLogicp25`) can call it directly — IPSR never called
   * `applyTocMappingOnLoad()` at all, so `partnersBody.institutions`/`otherPartnersSelected` were never
   * reclassified there. This describe asserts `reclassifyPartnersFromToc()` ALONE — invoked without going
   * through `applyTocMappingOnLoad()` — produces the exact same bucket-exclusivity behavior as the
   * `EPD-AC-1`-style fixtures above, mirrored onto the new method name.
   */
  describe('reclassifyPartnersFromToc() called directly (IPSR follow-up) — same bucket-exclusivity as applyTocMappingOnLoad', () => {
    const set2026 = () => jest.spyOn((service as any).fieldsManagerSE, 'isContributorsPartners2026').mockReturnValue(true);

    it('EPD-AC-1 falsifier, called directly: same institutions_id stored once from_toc: true and once from_toc: false — ends up in exactly one bucket', () => {
      set2026();
      service.partnersBody.institutions = [
        { institutions_id: 100, from_toc: true, full_name: 'Duplicated Partner (ToC copy)' },
        { institutions_id: 100, from_toc: false, full_name: 'Duplicated Partner (Other copy)' }
      ] as any;

      service.reclassifyPartnersFromToc();

      const inToc = service.partnersBody.institutions.some((i: any) => i.institutions_id === 100);
      const inOther = service.otherPartnersSelected.some((i: any) => i.institutions_id === 100);
      expect(inToc).toBe(true);
      expect(inOther).toBe(false);
      expect(service.partnersBody.institutions.find((i: any) => i.institutions_id === 100)?.from_toc).toBe(true);
    });

    it('is a no-op (never throws, never mutates) when the 2026 gate is off', () => {
      const institutions = [{ institutions_id: 100, from_toc: false }];
      service.partnersBody.institutions = institutions as any;
      service.otherPartnersSelected = ['pre-existing'] as any;

      service.reclassifyPartnersFromToc();

      expect(service.partnersBody.institutions).toBe(institutions);
      expect(service.otherPartnersSelected).toEqual(['pre-existing']);
    });

    it('applyTocMappingOnLoad() itself is unaffected by the extraction — its own EPD-AC-1 suite still passes unmodified (see the describe above)', () => {
      // Structural assertion: applyTocMappingOnLoad still performs the full reclassification end-to-end
      // (Centers + Science + Partners), proving the extraction is a pure refactor, not a behavior change.
      set2026();
      service.partnersBody.institutions = [
        { institutions_id: 200, from_toc: true },
        { institutions_id: 300, from_toc: false }
      ] as any;

      service.applyTocMappingOnLoad();

      expect(service.partnersBody.institutions.map((i: any) => i.institutions_id)).toEqual([200, service.OTHER_PARTNERS_CODE]);
      expect(service.otherPartnersSelected.map((i: any) => i.institutions_id)).toEqual([300]);
    });
  });

  /**
   * docs/specs/changes/partner-role-exclusive-selection PRL-T-1: `isRoleBlockedByOther` reports true
   * only for a non-`Other` role id when `Other` (id 4) is currently active on the row; `Other`'s own
   * id is never reported as blocked, and nothing is blocked when `Other` is absent.
   */
  describe('isRoleBlockedByOther (PRL-R-1/PRL-R-2/PRL-R-3)', () => {
    const otherActive = [{ partner_delivery_type_id: 4 }];

    it('PRL-AC-3: returns true for Scaling/Demand/Innovation (ids 1/2/3) when Other is active', () => {
      expect(service.isRoleBlockedByOther(otherActive, 1)).toBe(true);
      expect(service.isRoleBlockedByOther(otherActive, 2)).toBe(true);
      expect(service.isRoleBlockedByOther(otherActive, 3)).toBe(true);
    });

    it("never blocks Other's own id (4), even while Other is active", () => {
      expect(service.isRoleBlockedByOther(otherActive, 4)).toBe(false);
    });

    it('PRL-AC-4: returns false for ids 1/2/3 when Other is not active (deliveries empty)', () => {
      expect(service.isRoleBlockedByOther([], 1)).toBe(false);
      expect(service.isRoleBlockedByOther([], 2)).toBe(false);
      expect(service.isRoleBlockedByOther([], 3)).toBe(false);
    });

    it('PRL-R-4 (no regression): returns false for ids 1/2/3 when Scaling/Demand are active but Other is not', () => {
      const scalingAndDemand = [{ partner_delivery_type_id: 1 }, { partner_delivery_type_id: 2 }];
      expect(service.isRoleBlockedByOther(scalingAndDemand, 1)).toBe(false);
      expect(service.isRoleBlockedByOther(scalingAndDemand, 3)).toBe(false);
    });

    it('returns false when deliveries is not an array (defensive)', () => {
      expect(service.isRoleBlockedByOther(undefined as any, 1)).toBe(false);
    });
  });

  /**
   * docs/specs/changes/partner-role-exclusive-selection PRL-T-1: `onSelectDeliveryPartners` guard.
   */
  describe('onSelectDeliveryPartners — exclusive Other guard (PRL-R-2/PRL-R-4/PRL-R-5)', () => {
    beforeEach(() => {
      (mockApi as any).rolesSE = { readOnly: false };
    });

    it('PRL-AC-3: clicking Scaling/Demand/Innovation while Other is active is a true no-op — the delivery array is unchanged', () => {
      const option: any = { delivery: [{ partner_delivery_type_id: 4 }] };
      const before = option.delivery;

      service.onSelectDeliveryPartners(option, 1);

      expect(option.delivery).toBe(before); // same reference — never reassigned
      expect(option.delivery).toEqual([{ partner_delivery_type_id: 4 }]);
    });

    it('PRL-R-3: clicking Other again (deselect) still works while Other is active — the guard never blocks id 4', () => {
      const option: any = { delivery: [{ partner_delivery_type_id: 4 }] };

      service.onSelectDeliveryPartners(option, 4);

      expect(option.delivery).toEqual([]);
    });

    it('PRL-AC-1 (no regression): Scaling then Demand both become active — free multi-select when Other is not active', () => {
      const option: any = { delivery: [] };

      service.onSelectDeliveryPartners(option, 1);
      service.onSelectDeliveryPartners(option, 2);

      expect(option.delivery.map((d: any) => d.partner_delivery_type_id).sort()).toEqual([1, 2]);
    });

    it('PRL-AC-2 (no regression): selecting Other while Scaling+Demand are active clears them and activates only Other', () => {
      const option: any = { delivery: [{ partner_delivery_type_id: 1 }, { partner_delivery_type_id: 2 }] };

      service.onSelectDeliveryPartners(option, 4);

      expect(option.delivery).toEqual([{ partner_delivery_type_id: 4 }]);
    });

    it('respects the readOnly guard ahead of the Other-exclusive guard', () => {
      (mockApi as any).rolesSE = { readOnly: true };
      const option: any = { delivery: [] };

      service.onSelectDeliveryPartners(option, 1);

      expect(option.delivery).toEqual([]);
    });
  });
  /**
   * P2-3838 — IPSR: a Contributing W3/bilateral project selects its owning Center (bilateral BCT-R-1/R-3 rule),
   * and removing the project removes ONLY a Center this mechanism added. Owner = catalogue
   * `owner_center_institution_id` ↔ `centersList[].institutionId`.
   */
  describe('syncProjectDerivedCenters (P2-3838)', () => {
    const codes = () => (service.partnersBody.contributing_center || []).map((c: any) => c.code);

    beforeEach(() => {
      jest.useFakeTimers();
      (mockCentersSE.centersList as any) = [
        { code: 'C1', full_name: 'Center One', institutionId: 101 },
        { code: 'C2', full_name: 'Center Two', institutionId: 102 },
        { code: 'C3', full_name: 'Center Three', institutionId: 103 }
      ];
      service.clarisaProjectsList = [
        { id: 1, project_id: 1, fullName: 'P-1 owned by C1', owner_center_institution_id: 101 },
        { id: 2, project_id: 2, fullName: 'P-2 owned by C1', owner_center_institution_id: 101 },
        { id: 3, project_id: 3, fullName: 'P-3 owned by C2', owner_center_institution_id: 102 },
        { id: 4, project_id: 4, fullName: 'P-4 unknown owner', owner_center_institution_id: null }
      ];
      service.partnersBody.contributing_center = [];
      service.partnersBody.bilateral_projects = [];
    });

    afterEach(() => jest.useRealTimers());

    it('adds the owner Center when a project is picked, locked and in the dropdown lock list', () => {
      service.partnersBody.bilateral_projects = [{ project_id: 1, fullName: 'P-1 owned by C1' }] as any;
      service.syncProjectDerivedCenters();

      expect(codes()).toEqual(['C1']);
      const c1 = service.partnersBody.contributing_center[0];
      expect(service.isProjectDerivedCenter(c1)).toBe(true);
      expect(service.isDerivedCenterEntering(c1)).toBe(true);
      expect(service.centersLockedInDropdown.map((c: any) => c.code)).toEqual(['C1']);
      expect(service.projectDerivedCenterTooltip(c1)).toContain('P-1 owned by C1');
    });

    it('removes the auto-added Center (after the exit animation) when its project is removed', () => {
      service.partnersBody.bilateral_projects = [{ project_id: 1 }] as any;
      service.syncProjectDerivedCenters();
      service.partnersBody.bilateral_projects = [];
      service.syncProjectDerivedCenters();

      expect(service.isDerivedCenterLeaving(service.partnersBody.contributing_center[0])).toBe(true);
      jest.advanceTimersByTime(RdContributorsAndPartnersService.DERIVED_CHIP_LEAVE_MS);
      expect(codes()).toEqual([]);
      expect(service.centersLockedInDropdown).toEqual([]);
    });

    it('never removes a Center the user picked by hand — it is only locked while the project stays', () => {
      service.partnersBody.contributing_center = [{ code: 'C1', institutionId: 101 }] as any;
      service.partnersBody.bilateral_projects = [{ project_id: 1 }] as any;
      service.syncProjectDerivedCenters();
      expect(codes()).toEqual(['C1']);
      expect(service.isProjectDerivedCenter(service.partnersBody.contributing_center[0])).toBe(true);

      service.partnersBody.bilateral_projects = [];
      service.syncProjectDerivedCenters();
      jest.runAllTimers();
      expect(codes()).toEqual(['C1']);
      expect(service.isProjectDerivedCenter(service.partnersBody.contributing_center[0])).toBe(false);
    });

    it('keeps the Center while ANOTHER selected project still owns it', () => {
      service.partnersBody.bilateral_projects = [{ project_id: 1 }, { project_id: 2 }] as any;
      service.syncProjectDerivedCenters();
      service.partnersBody.bilateral_projects = [{ project_id: 2 }] as any;
      service.syncProjectDerivedCenters();
      jest.runAllTimers();
      expect(codes()).toEqual(['C1']);
    });

    it('adds one chip per owner, never a duplicate', () => {
      service.partnersBody.bilateral_projects = [{ project_id: 1 }, { project_id: 2 }, { project_id: 3 }] as any;
      service.syncProjectDerivedCenters();
      service.syncProjectDerivedCenters(); // double call = same state
      expect(codes()).toEqual(['C1', 'C2']);
    });

    it('derives nothing for a project whose owner cannot be resolved', () => {
      service.partnersBody.bilateral_projects = [{ project_id: 4 }] as any;
      service.syncProjectDerivedCenters();
      expect(codes()).toEqual([]);
    });

    it('cancels the exit when the project comes back before the animation ends', () => {
      service.partnersBody.bilateral_projects = [{ project_id: 1 }] as any;
      service.syncProjectDerivedCenters();
      service.partnersBody.bilateral_projects = [];
      service.syncProjectDerivedCenters();
      service.partnersBody.bilateral_projects = [{ project_id: 1 }] as any;
      service.syncProjectDerivedCenters();
      jest.runAllTimers();
      expect(codes()).toEqual(['C1']);
      expect(service.isProjectDerivedCenter(service.partnersBody.contributing_center[0])).toBe(true);
    });

    it('clears the Lead center when it pointed at the auto-added Center that leaves', () => {
      service.partnersBody.bilateral_projects = [{ project_id: 1 }] as any;
      service.syncProjectDerivedCenters();
      service.leadCenterCode = 'C1';
      service.partnersBody.bilateral_projects = [];
      service.syncProjectDerivedCenters();
      jest.runAllTimers();
      expect(service.leadCenterCode).toBeNull();
    });

    it('takes over a Center the Lead pick auto-added, so a later Lead swap cannot strip it', () => {
      service.partnersBody.contributing_center = [{ code: 'C1', institutionId: 101 }] as any;
      service.autoAddedLeadCenterCode = 'C1';
      service.partnersBody.bilateral_projects = [{ project_id: 1 }] as any;
      service.syncProjectDerivedCenters();
      expect(service.autoAddedLeadCenterCode).toBeNull();

      service.partnersBody.bilateral_projects = [];
      service.syncProjectDerivedCenters();
      jest.runAllTimers();
      expect(codes()).toEqual([]);
    });

    it('resolves a SAVED project from obj_clarisa_project.organizationCode when the catalogue has no row', () => {
      service.clarisaProjectsList = [];
      service.partnersBody.bilateral_projects = [{ project_id: 99, obj_clarisa_project: { id: 99, organizationCode: '102', fullName: 'Saved' } }] as any;
      service.syncProjectDerivedCenters({ animate: false });
      expect(codes()).toEqual(['C2']);
      expect(service.isDerivedCenterEntering(service.partnersBody.contributing_center[0])).toBe(false);
    });

    it('resetState forgets every derived Center', () => {
      service.partnersBody.bilateral_projects = [{ project_id: 1 }] as any;
      service.syncProjectDerivedCenters();
      service.resetState();
      expect(service.centersLockedInDropdown).toEqual([]);
      expect(service.isProjectDerivedCenter({ code: 'C1' })).toBe(false);
    });
  });
});
