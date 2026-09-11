import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform, provideZonelessChangeDetection, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';

import { CPNormalSelectorComponent } from './normal-selector.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../../../../../shared/services/global/roles.service';
import { RdContributorsAndPartnersService } from '../../../../rd-contributors-and-partners.service';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../../../../../shared/services/global/green-checks.service';
import { DataControlService } from '../../../../../../../../../../shared/services/data-control.service';
import { CustomFieldsModule } from '../../../../../../../../../../custom-fields/custom-fields.module';
import { PrMultiSelectComponent } from '../../../../../../../../../../custom-fields/pr-multi-select/pr-multi-select.component';
import { FieldsManagerService } from '../../../../../../../../../../shared/services/fields-manager.service';

/**
 * TOC-T-2 (docs/specs/bugfix/toc-unmapped-orange-notes) — the External Partners "not found" note
 * (`.pr-message`) fires whenever `isCP2026()` is true, regardless of whether the result was ever
 * mapped to a ToC node. Answering **No** to "Can this result be mapped to a ToC KPI?" means
 * `tocReferencePartnerInstitutionIds()` is (correctly) empty, but the old gate reads that as
 * "the ToC returned zero partners" and shows the orange note anyway — a false positive.
 *
 * TOC-R-1 / TOC-AC-1: `planned_result === false` must suppress the note and fall through to the
 * plain full-catalog dropdown (the same branch already used pre-2026).
 * TOC-R-2 / TOC-AC-2 (regression guard): `planned_result === true` with empty ToC refs must keep
 * showing the note — AC4 (P2-2998) behavior is untouched by this fix.
 */
describe('CPNormalSelectorComponent — External Partners note suppressed on unmapped (No) results (TOC-T-2)', () => {
  let fixture: ComponentFixture<CPNormalSelectorComponent>;

  @Pipe({ name: 'countInstitutionsTypes', standalone: false })
  class CountInstitutionsTypesStubPipe implements PipeTransform {
    transform(value: any[]): any[] {
      return value || [];
    }
  }

  const partner = (id: number, name: string) => ({
    institutions_id: id,
    institutions_name: name,
    full_name: name,
    obj_institutions: { name, obj_institution_type_code: { name: 'NGO', id: 1 } }
  });

  // The ToC-block catalogue (what `referenceExternalPartners()` / `otherPartnersList()` filter over).
  const TOC_CATALOGUE = [partner(10, 'ToC partner')];
  // The flat/legacy catalogue fed to the plain full-catalog dropdown — deliberately a DIFFERENT,
  // larger set so a test can tell which branch actually rendered by checking which list arrived.
  const FLAT_FULL_CATALOGUE = [partner(100, 'Flat partner A'), partner(200, 'Flat partner B'), partner(300, 'Flat partner C')];

  const setup = (opts: { plannedResult: boolean; tocPartnerIds: number[] }) => {
    const rdPartnersMock = {
      OTHER_PARTNERS_CODE: -1,
      toggle: 0,
      tocReferencePartnerInstitutionIds: signal<number[]>(opts.tocPartnerIds),
      // UCA-T-9 attempt 3, Issue 2: `sectionHydratedFromToc: false` reproduces this suite's original
      // (pre-fix) behavior — the guard is a no-op before hydration, so these unrelated TOC-T-2 cases
      // are unaffected by the new hydration gate.
      sectionHydratedFromToc: signal<boolean>(false),
      tocSelectionTouched: signal<boolean>(false),
      buildOtherPartnersSentinel: () => ({ institutions_id: -1, full_name: 'Other' }),
      partnersBody: {
        institutions: [],
        no_applicable_partner: false,
        result_toc_result: { planned_result: opts.plannedResult }
      },
      otherPartnersSelected: [],
      setPossibleLeadPartners: jest.fn(),
      validateDeliverySelectionPartners: () => false,
      isRoleBlockedByOther: () => false,
      onSelectDeliveryPartners: jest.fn(),
      removePartner: jest.fn()
    };

    TestBed.configureTestingModule({
      declarations: [CPNormalSelectorComponent, CountInstitutionsTypesStubPipe],
      imports: [CommonModule, CustomFieldsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: { dataControlSE: { currentResult: { result_code: 'R-1', version_id: 1 } } } },
        { provide: RolesService, useValue: { readOnly: false } },
        { provide: RdContributorsAndPartnersService, useValue: rdPartnersMock },
        {
          provide: InstitutionsService,
          useValue: {
            institutionsWithoutCentersListPartners: FLAT_FULL_CATALOGUE,
            institutionsWithoutCentersPartners: signal<any[]>(TOC_CATALOGUE)
          }
        },
        { provide: GreenChecksService, useValue: {} },
        { provide: DataControlService, useValue: { isKnowledgeProduct: false } },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    fixture = TestBed.createComponent(CPNormalSelectorComponent);
    fixture.detectChanges();
  };

  const pr_messages = () => fixture.nativeElement.querySelectorAll('.pr-message');
  const firstMultiSelectOptions = (): any[] => {
    const multiSelects = fixture.debugElement.queryAll(By.directive(PrMultiSelectComponent));
    expect(multiSelects.length).toBeGreaterThan(0);
    return multiSelects[0].componentInstance.options() ?? [];
  };

  it('TOC-TEST-3 (AC1): No answer (planned_result=false) renders zero .pr-message notes and feeds the full flat catalog', () => {
    setup({ plannedResult: false, tocPartnerIds: [] });

    expect(pr_messages().length).toBe(0);

    const options = firstMultiSelectOptions();
    expect(options.map((o: any) => o.institutions_id)).toEqual([100, 200, 300]);
  });

  it('TOC-TEST-3b (rework, Reviewer FAIL remediation): No answer renders EXACTLY ONE partner multi-select and no "Other(s)" block', () => {
    setup({ plannedResult: false, tocPartnerIds: [] });

    const multiSelects = fixture.debugElement.queryAll(By.directive(PrMultiSelectComponent));
    expect(multiSelects.length).toBe(1);

    const otherPartnersEl = fixture.nativeElement.querySelector('[data-testid="toc-other-partners"]');
    expect(otherPartnersEl).toBeNull();
  });

  it('TOC-TEST-4 (AC2, regression guard): Yes answer + empty ToC refs still shows the "No External Partners" note', () => {
    setup({ plannedResult: true, tocPartnerIds: [] });

    const messages = pr_messages();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].textContent).toContain('No External Partners related to the established HLO/Outcomes were found');
  });
});

/**
 * `UCA-T-9` attempt 3, Issue 2 (docs/specs/changes/unsaved-changes-alert) — `preselectPartnersEffect`
 * lacked the same `sectionHydratedFromToc()`/`tocSelectionTouched()` hydration guard its two
 * siblings in the parent component (`preselectCentersEffect`/`preselectScienceEffect`,
 * `rd-contributors-and-partners.component.ts`) already carry. `tocReferencePartnerInstitutionIds`
 * is written asynchronously by `multiple-wps-content`'s ToC-resolution effect, AFTER the parent's
 * own load-flow dirty-diff snapshot — without the guard, any 2026 result whose mapped ToC node has
 * external partners, with no partners selected yet, loaded dirty and the next Back/Next silently
 * saved with the contribution email.
 *
 * Falsifying input: revert the guard in `normal-selector.component.ts` and the first test below
 * fails — the late `tocReferencePartnerInstitutionIds` write (simulating the post-load async
 * ToC-resolution effect) populates `body.institutions` even though the section is already hydrated
 * and the user never touched the ToC selection. Self-verified: reverting the guard line made this
 * test fail (`toEqual([10])` where `toEqual([])` was expected), reapplying made it pass again.
 */
describe('CPNormalSelectorComponent — preselectPartnersEffect hydration guard (UCA-T-9 attempt 3, Issue 2)', () => {
  let fixture: ComponentFixture<CPNormalSelectorComponent>;
  let rdPartnersMock: any;

  @Pipe({ name: 'countInstitutionsTypes', standalone: false })
  class CountInstitutionsTypesStubPipe implements PipeTransform {
    transform(value: any[]): any[] {
      return value || [];
    }
  }

  const partner = (id: number, name: string) => ({
    institutions_id: id,
    institutions_name: name,
    full_name: name,
    obj_institutions: { name, obj_institution_type_code: { name: 'NGO', id: 1 } }
  });

  const TOC_CATALOGUE = [partner(10, 'ToC partner')];

  const setup = (opts: { sectionHydratedFromToc: boolean; tocSelectionTouched: boolean }) => {
    rdPartnersMock = {
      OTHER_PARTNERS_CODE: -1,
      toggle: 0,
      tocReferencePartnerInstitutionIds: signal<number[]>([]),
      sectionHydratedFromToc: signal<boolean>(opts.sectionHydratedFromToc),
      tocSelectionTouched: signal<boolean>(opts.tocSelectionTouched),
      buildOtherPartnersSentinel: () => ({ institutions_id: -1, full_name: 'Other' }),
      partnersBody: {
        institutions: [],
        no_applicable_partner: false,
        result_toc_result: { planned_result: true }
      },
      otherPartnersSelected: [],
      setPossibleLeadPartners: jest.fn(),
      validateDeliverySelectionPartners: () => false,
      isRoleBlockedByOther: () => false,
      onSelectDeliveryPartners: jest.fn(),
      removePartner: jest.fn()
    };

    TestBed.configureTestingModule({
      declarations: [CPNormalSelectorComponent, CountInstitutionsTypesStubPipe],
      imports: [CommonModule, CustomFieldsModule],
      providers: [
        { provide: ApiService, useValue: { dataControlSE: { currentResult: { result_code: 'R-1', version_id: 1 } } } },
        { provide: RolesService, useValue: { readOnly: false } },
        { provide: RdContributorsAndPartnersService, useValue: rdPartnersMock },
        {
          provide: InstitutionsService,
          useValue: {
            institutionsWithoutCentersListPartners: [],
            institutionsWithoutCentersPartners: signal<any[]>(TOC_CATALOGUE)
          }
        },
        { provide: GreenChecksService, useValue: {} },
        { provide: DataControlService, useValue: { isKnowledgeProduct: false } },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    fixture = TestBed.createComponent(CPNormalSelectorComponent);
    fixture.detectChanges();
  };

  const flush = () => fixture.detectChanges();

  it('a cold-entry section (hydrated, untouched) stays clean when the ToC reference resolves AFTER load', () => {
    setup({ sectionHydratedFromToc: true, tocSelectionTouched: false });

    // Simulates `multiple-wps-content`'s async ToC-resolution effect writing the reference AFTER
    // the parent's own load-flow snapshot already ran (the exact `UCA-T-9` attempt-2 FAIL scenario).
    rdPartnersMock.tocReferencePartnerInstitutionIds.set([10]);
    flush();

    expect(rdPartnersMock.partnersBody.institutions).toEqual([]);
    expect(rdPartnersMock.setPossibleLeadPartners).not.toHaveBeenCalled();
  });

  it('a genuine in-session ToC selection (tocSelectionTouched) still authorizes the prefill', () => {
    setup({ sectionHydratedFromToc: true, tocSelectionTouched: true });

    rdPartnersMock.tocReferencePartnerInstitutionIds.set([10]);
    flush();

    expect(rdPartnersMock.partnersBody.institutions.map((i: any) => i.institutions_id)).toEqual([10]);
  });

  it('a fresh (not-yet-hydrated) load still prefills — the guard only blocks the post-hydration case', () => {
    setup({ sectionHydratedFromToc: false, tocSelectionTouched: false });

    rdPartnersMock.tocReferencePartnerInstitutionIds.set([10]);
    flush();

    expect(rdPartnersMock.partnersBody.institutions.map((i: any) => i.institutions_id)).toEqual([10]);
  });
});

/**
 * PRL-T-1 (docs/specs/changes/partner-role-exclusive-selection) — the Scaling/Demand/Innovation
 * pills render `blocked` + `aria-disabled="true"` and are click no-ops (through the REAL service,
 * so the guard in `onSelectDeliveryPartners` is actually exercised) when `Other` is the active
 * Partner role on that row, in BOTH duplicated selected-partner blocks (ToC + "Other(s)").
 */
describe('CPNormalSelectorComponent - Other-exclusive role block (PRL-T-1)', () => {
  let fixture: ComponentFixture<CPNormalSelectorComponent>;
  let rdPartnersSE: RdContributorsAndPartnersService;
  let tocOption: any;
  let otherOption: any;

  @Pipe({ name: 'countInstitutionsTypes', standalone: false })
  class CountInstitutionsTypesStubPipe implements PipeTransform {
    transform(value: any[]): any[] {
      return value || [];
    }
  }

  const delivery = (id: number) => ({ partner_delivery_type_id: id });

  const chipOption = (id: number, name: string, deliveries: any[]) => ({
    institutions_id: id,
    institutions_name: name,
    full_name: name,
    delivery: deliveries,
    obj_institutions: { name, obj_institution_type_code: { name: 'NGO', id: 1 } }
  });

  const setup = (opts: { tocDeliveries?: any[]; otherDeliveries?: any[] } = {}) => {
    tocOption = chipOption(10, 'ToC partner', opts.tocDeliveries ?? []);
    otherOption = chipOption(20, 'Other partner', opts.otherDeliveries ?? []);

    TestBed.configureTestingModule({
      declarations: [CPNormalSelectorComponent, CountInstitutionsTypesStubPipe],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: ApiService,
          useValue: { dataControlSE: { currentResult: { result_code: 'R-1', version_id: 1 } }, rolesSE: { readOnly: false } }
        },
        { provide: RolesService, useValue: { readOnly: false } },
        // Uses the REAL service (not a mock) so the guard added to onSelectDeliveryPartners is exercised end-to-end.
        RdContributorsAndPartnersService,
        {
          provide: InstitutionsService,
          useValue: { institutionsWithoutCentersListPartners: [], institutionsWithoutCentersPartners: signal<any[]>([]) }
        },
        { provide: GreenChecksService, useValue: {} },
        { provide: DataControlService, useValue: { isKnowledgeProduct: false } },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    rdPartnersSE.partnersBody = { institutions: [tocOption], no_applicable_partner: false } as any;
    rdPartnersSE.otherPartnersSelected = [otherOption];

    fixture = TestBed.createComponent(CPNormalSelectorComponent);
    fixture.detectChanges();
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const blocks = (): HTMLElement[] => Array.from(el().querySelectorAll('.chips_container'));
  // Pills render in Scaling(1), Demand(2), Innovation(3), Other(4) order.
  const pills = (container: HTMLElement) => Array.from(container.querySelectorAll('.delivery')) as HTMLElement[];

  it('PRL-AC-3/PRL-R-1: Scaling/Demand/Innovation carry class "blocked" and aria-disabled="true" when Other is active, in BOTH blocks', () => {
    setup({ tocDeliveries: [delivery(4)], otherDeliveries: [delivery(4)] });

    blocks().forEach(container => {
      const [scaling, demand, innovation, other] = pills(container);
      [scaling, demand, innovation].forEach(pill => {
        expect(pill.classList.contains('blocked')).toBe(true);
        expect(pill.getAttribute('aria-disabled')).toBe('true');
      });
      // Other's own button is never blocked.
      expect(other.classList.contains('blocked')).toBe(false);
      expect(other.getAttribute('aria-disabled')).toBeNull();
    });
  });

  it('PRL-AC-3/PRL-R-2: clicking a blocked pill is a true no-op - delivery is unchanged', () => {
    setup({ tocDeliveries: [delivery(4)] });

    const scalingPill = pills(blocks()[0])[0];
    scalingPill.click();

    expect(tocOption.delivery).toEqual([{ partner_delivery_type_id: 4 }]);
  });

  it('PRL-AC-4/PRL-R-3: deselecting Other restores Scaling/Demand/Innovation to normal, interactive, undimmed state', () => {
    setup({ tocDeliveries: [] });

    blocks().forEach(container => {
      const [scaling, demand, innovation] = pills(container);
      [scaling, demand, innovation].forEach(pill => {
        expect(pill.classList.contains('blocked')).toBe(false);
        expect(pill.getAttribute('aria-disabled')).toBeNull();
      });
    });
  });

  it('PRL-R-4 (no regression): Scaling/Demand remain a free multi-select and are clickable when Other is not active', () => {
    setup({ tocDeliveries: [] });

    const [scalingPill, demandPill] = pills(blocks()[0]);
    scalingPill.click();
    fixture.detectChanges();
    demandPill.click();
    fixture.detectChanges();

    expect(tocOption.delivery.map((d: any) => d.partner_delivery_type_id).sort()).toEqual([1, 2]);
  });
});
