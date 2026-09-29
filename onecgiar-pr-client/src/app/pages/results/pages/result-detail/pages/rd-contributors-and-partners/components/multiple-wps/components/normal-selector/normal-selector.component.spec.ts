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

/**
 * P2-3738 — the partner cards turn green only when every selected partner has a role, which is the
 * same rule the hidden `Partner role: <name>` markers report to the missing-field counter.
 */
describe('CPNormalSelectorComponent — partner cards need every role (P2-3738)', () => {
  const withRole = (id: number) => ({ institutions_id: id, delivery: [{ partner_delivery_type_id: 1 }] });
  const withoutRole = (id: number) => ({ institutions_id: id, delivery: [] });

  const selector = (institutions: any[], others: any[], notApplicable = false) => {
    const component = Object.create(CPNormalSelectorComponent.prototype);
    component.OTHER_PARTNERS_CODE = -1;
    component.rdPartnersSE = {
      partnersBody: { institutions, no_applicable_partner: notApplicable },
      otherPartnersSelected: others
    };
    return component as CPNormalSelectorComponent;
  };

  it('is not complete with partners selected but a role missing', () => {
    expect(selector([withRole(1), withoutRole(2)], []).partnersCardComplete).toBe(false);
    expect(selector([withRole(1)], [withoutRole(3)]).partnersCardComplete).toBe(false);
  });

  it('is complete once every selected partner has a role, the "Other" sentinel aside', () => {
    expect(selector([withRole(1), { institutions_id: -1 }], [withRole(3)]).partnersCardComplete).toBe(true);
  });

  it('is complete when the section is marked not applicable, and never with nothing selected', () => {
    expect(selector([], [], true).partnersCardComplete).toBe(true);
    expect(selector([], []).partnersCardComplete).toBe(false);
  });

  it('judges the "Other(s)" card on its own partners only', () => {
    expect(selector([withoutRole(1)], [withRole(3)]).otherPartnersRolesComplete).toBe(true);
    expect(selector([withRole(1)], [withoutRole(3)]).otherPartnersRolesComplete).toBe(false);
    expect(selector([withRole(1)], []).otherPartnersRolesComplete).toBe(false);
  });
});

/**
 * docs/specs/bugfix/external-partners-duplication EPD-T-2 (EPD-R-2/EPD-AC-2): picking an
 * institution already selected in the SIBLING bucket must be a no-op, never a second entry.
 * `pr-multi-select.onSelectOption` mutates its bound ngModel BEFORE emitting `selectOptionEvent`
 * (verified in `pr-multi-select.component.ts`), so by the time these handlers run the duplicate is
 * already sitting in the array — the handler's job is to undo that add.
 */
describe('onPartnerSelect / onOtherPartnerSelect never leave a duplicate across buckets (EPD-R-2/EPD-AC-2)', () => {
  const OTHER_PARTNERS_CODE = -1;

  const makeComponent = (institutions: any[], otherPartnersSelected: any[]) => {
    const component = Object.create(CPNormalSelectorComponent.prototype);
    component.OTHER_PARTNERS_CODE = OTHER_PARTNERS_CODE;
    component.userTouchedPartners = false;
    component.rdPartnersSE = {
      OTHER_PARTNERS_CODE,
      partnersBody: { institutions, no_applicable_partner: false },
      otherPartnersSelected,
      leadPartnerId: null,
      setPossibleLeadPartners: jest.fn(),
      // Real filter-by-institutions_id semantics, mirroring RdContributorsAndPartnersService.excludeInstitutionsIn.
      excludeInstitutionsIn: (list: any[], excludeIds: Set<number>) => (list || []).filter((i: any) => !excludeIds.has(i?.institutions_id))
    };
    return component as CPNormalSelectorComponent;
  };

  it('EPD-AC-2: picking (via the ToC dropdown) an institution already in "Other(s)" undoes the just-applied add', () => {
    // pr-multi-select already pushed 200 into `institutions` before this handler runs; the sentinel
    // (-1) is present so the unrelated "Other deselected" clearing branch does not fire.
    const institutions = [{ institutions_id: OTHER_PARTNERS_CODE }, { institutions_id: 100 }, { institutions_id: 200 }];
    const otherPartnersSelected = [{ institutions_id: 200 }];
    const component = makeComponent(institutions, otherPartnersSelected);

    component.onPartnerSelect({ option: { institutions_id: 200 } });

    const rdPartnersSE: any = (component as any).rdPartnersSE;
    expect(rdPartnersSE.partnersBody.institutions.map((i: any) => i.institutions_id)).toEqual([OTHER_PARTNERS_CODE, 100]);
    // The sibling bucket is untouched — the ToC copy is the one removed, not the Other(s) one.
    expect(rdPartnersSE.otherPartnersSelected.map((i: any) => i.institutions_id)).toEqual([200]);
  });

  it('EPD-AC-2: picking (via the "Other(s)" dropdown) an institution already in the ToC bucket undoes the just-applied add', () => {
    const institutions = [{ institutions_id: 100 }];
    // pr-multi-select already pushed 100 into `otherPartnersSelected` before this handler runs.
    const otherPartnersSelected = [{ institutions_id: 300 }, { institutions_id: 100 }];
    const component = makeComponent(institutions, otherPartnersSelected);

    component.onOtherPartnerSelect({ option: { institutions_id: 100 } });

    const rdPartnersSE: any = (component as any).rdPartnersSE;
    expect(rdPartnersSE.otherPartnersSelected.map((i: any) => i.institutions_id)).toEqual([300]);
    expect(rdPartnersSE.partnersBody.institutions.map((i: any) => i.institutions_id)).toEqual([100]);
  });

  it('disqualifier check: a genuinely different institution (no institutions_id collision) is never stripped', () => {
    const institutions = [{ institutions_id: OTHER_PARTNERS_CODE }, { institutions_id: 100 }];
    const otherPartnersSelected = [{ institutions_id: 300 }];
    const component = makeComponent(institutions, otherPartnersSelected);

    component.onPartnerSelect({ option: { institutions_id: 100 } });

    const rdPartnersSE: any = (component as any).rdPartnersSE;
    expect(rdPartnersSE.partnersBody.institutions.map((i: any) => i.institutions_id)).toEqual([OTHER_PARTNERS_CODE, 100]);
    expect(rdPartnersSE.otherPartnersSelected.map((i: any) => i.institutions_id)).toEqual([300]);
  });
});

/**
 * P2-3839 — the segmented Partner role look is opt-in for IPSR (`variant="ipsr"`). Results W1/W2
 * never set the variant, so they must keep the old markup: pills without the inline check SVG and
 * the Material `delete` icon. The IPSR variant renders the check SVG in every pill and a real
 * `<button class="remove_partner">` wired to the same handlers.
 */
describe('CPNormalSelectorComponent — Partner role variant (P2-3839)', () => {
  let fixture: ComponentFixture<CPNormalSelectorComponent>;
  let rdPartnersSE: RdContributorsAndPartnersService;

  @Pipe({ name: 'countInstitutionsTypes', standalone: false })
  class CountInstitutionsTypesStubPipe implements PipeTransform {
    transform(value: any[]): any[] {
      return value || [];
    }
  }

  const chipOption = (id: number, name: string) => ({
    institutions_id: id,
    institutions_name: name,
    full_name: name,
    delivery: [{ partner_delivery_type_id: 1 }],
    obj_institutions: { name, obj_institution_type_code: { name: 'NGO', id: 1 } }
  });

  const setup = (variant?: 'default' | 'ipsr') => {
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
    rdPartnersSE.partnersBody = { institutions: [chipOption(10, 'ToC partner')], no_applicable_partner: false } as any;
    rdPartnersSE.otherPartnersSelected = [chipOption(20, 'Other partner')];

    fixture = TestBed.createComponent(CPNormalSelectorComponent);
    if (variant) fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] => Array.from(el().querySelectorAll('.pr_chip_selected'));

  it('defaults to the W1/W2 look: no host class, no check SVG, Material delete icon, no remove button', () => {
    setup();

    expect(fixture.componentInstance.variant).toBe('default');
    expect(el().classList.contains('ipsr-variant')).toBe(false);
    expect(rows().length).toBe(2);
    expect(el().querySelectorAll('.dlv_check').length).toBe(0);
    expect(el().querySelectorAll('.remove_partner').length).toBe(0);

    rows().forEach(row => {
      const container = row.querySelector('.deliveries_container') as HTMLElement;
      // Same element structure as before P2-3839: the pill track, then the <i>delete</i> icon.
      expect(Array.from(container.children).map(c => c.tagName)).toEqual(['DIV', 'I']);
      const icon = container.querySelector('i') as HTMLElement;
      expect(icon.className).toBe('material-icons-round');
      expect(icon.textContent.trim()).toBe('delete');
      // Pills keep only their label text (the default check is the CSS ::before glyph).
      const pills = Array.from(row.querySelectorAll('.delivery')) as HTMLElement[];
      expect(pills.map(p => p.children.length)).toEqual([0, 0, 0, 0]);
      expect(pills.map(p => p.textContent.trim())).toEqual(['Scaling', 'Demand', 'Innovation', 'Other']);
    });
  });

  it('variant="ipsr" renders the segmented group: host class, a check SVG per pill and a remove button per row', () => {
    setup('ipsr');

    expect(el().classList.contains('ipsr-variant')).toBe(true);
    expect(el().querySelectorAll('.deliveries_container i.material-icons-round').length).toBe(0);

    rows().forEach(row => {
      const pills = Array.from(row.querySelectorAll('.delivery')) as HTMLElement[];
      expect(pills.map(p => p.textContent.trim())).toEqual(['Scaling', 'Demand', 'Innovation', 'Other']);
      pills.forEach(p => expect(p.querySelector('svg.dlv_check')).not.toBeNull());
      const remove = row.querySelector('button.remove_partner') as HTMLButtonElement;
      expect(remove).not.toBeNull();
      expect(remove.getAttribute('type')).toBe('button');
      expect(remove.getAttribute('aria-label')).toBe('Remove partner');
    });
  });

  it('variant="ipsr" keeps the same handlers: pills toggle roles and the remove buttons call removePartner / deleteOtherPartner', () => {
    setup('ipsr');
    const removeSpy = jest.spyOn(rdPartnersSE, 'removePartner').mockImplementation(() => undefined);
    const deleteOtherSpy = jest.spyOn(fixture.componentInstance, 'deleteOtherPartner').mockImplementation(() => undefined);

    const [tocRow, otherRow] = rows();
    (tocRow.querySelectorAll('.delivery')[1] as HTMLElement).click();
    fixture.detectChanges();
    expect(rdPartnersSE.partnersBody.institutions[0].delivery.map((d: any) => d.partner_delivery_type_id).sort()).toEqual([1, 2]);

    (tocRow.querySelector('button.remove_partner') as HTMLButtonElement).click();
    expect(removeSpy).toHaveBeenCalledWith(0);
    (otherRow.querySelector('button.remove_partner') as HTMLButtonElement).click();
    expect(deleteOtherSpy).toHaveBeenCalledWith(0);
  });
});

/**
 * `EPD-T-5` rework (docs/specs/bugfix/external-partners-duplication), Reviewer FAIL remediation
 * option (a): the original repro shape — 6 institutions each present TWICE (once in the ToC
 * bucket, once in "Other(s)") — driven through the REAL `onPartnerSelect`/`onOtherPartnerSelect`
 * handlers, under BOTH the plain (`setup()`) and IPSR (`setup('ipsr')`) hosts. `EPD-T-2`'s own task
 * explicitly assigned this end-to-end confirmation to `EPD-T-5` (`tasks.md` "EPD-T-2 Consumers");
 * the narrower per-institution unit tests above (`onPartnerSelect / onOtherPartnerSelect never
 * leave a duplicate across buckets`) construct the component via `Object.create` and never render
 * `variant="ipsr"` at all, so the IPSR host path was previously exercised by nobody.
 *
 * Uses the REAL `RdContributorsAndPartnersService` (same pattern as the `PRL-T-1` / `P2-3839`
 * suites above) so `excludeInstitutionsIn` runs for real, not a mock re-implementation of it.
 *
 * Falsifier: revert the sibling-bucket exclusion in `onPartnerSelect`/`onOtherPartnerSelect`
 * (`normal-selector.component.ts`) and both `it`s below fail — the removed duplicate id stays in
 * BOTH buckets and `allSelectedPartners.length` reports 9 (6 untouched + 3 genuinely resolved)
 * instead of 6.
 */
describe('CPNormalSelectorComponent — EPD-T-5 rework: 6-institutions-doubled repro via real handlers, both variants', () => {
  let fixture: ComponentFixture<CPNormalSelectorComponent>;
  let rdPartnersSE: RdContributorsAndPartnersService;

  @Pipe({ name: 'countInstitutionsTypes', standalone: false })
  class CountInstitutionsTypesStubPipe implements PipeTransform {
    transform(value: any[]): any[] {
      return value || [];
    }
  }

  const partner = (id: number, fromToc: boolean) => ({
    institutions_id: id,
    institutions_name: `Partner ${id}`,
    full_name: `Partner ${id}`,
    from_toc: fromToc,
    obj_institutions: { name: `Partner ${id}`, obj_institution_type_code: { name: 'NGO', id: 1 } }
  });

  // The exact original repro shape: 6 institutions, each present once in the ToC bucket
  // (`partnersBody.institutions`, `from_toc: true`) and once more in "Other(s)"
  // (`otherPartnersSelected`, `from_toc: false`) — mirroring attempt 1's 6-institutions-doubled
  // fixture shape (`rd-contributors-and-partners.service.spec.ts` / `results_by_institutions.service.spec.ts`).
  const SIX_IDS = [101, 102, 103, 104, 105, 106];

  const setup = (variant?: 'default' | 'ipsr') => {
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
        // Real service (not a mock) — exercises the actual `excludeInstitutionsIn` implementation.
        RdContributorsAndPartnersService,
        {
          provide: InstitutionsService,
          useValue: {
            institutionsList: [],
            institutionsWithoutCentersListPartners: [],
            institutionsWithoutCentersPartners: signal<any[]>([])
          }
        },
        { provide: GreenChecksService, useValue: {} },
        { provide: DataControlService, useValue: { isKnowledgeProduct: false } },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => true } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });

    rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    // The "Other(s)" sentinel must be present in the ToC bucket, or `onPartnerSelect` treats it as
    // "Other was just deselected" and wipes `otherPartnersSelected` before the exclusion logic runs
    // (see `onPartnerSelect`'s `if (!this.otherSentinelSelected) ... = []` guard) — that branch is
    // unrelated to EPD-2/EPD-AC-2 and must not fire here.
    rdPartnersSE.partnersBody = {
      institutions: [rdPartnersSE.buildOtherPartnersSentinel(), ...SIX_IDS.map(id => partner(id, true))],
      no_applicable_partner: false
    } as any;
    rdPartnersSE.otherPartnersSelected = SIX_IDS.map(id => partner(id, false));

    fixture = TestBed.createComponent(CPNormalSelectorComponent);
    if (variant) fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
  };

  /**
   * Resolves all 6 duplicated institutions by re-driving the real selection handlers, exactly as
   * `pr-multi-select`'s `(selectOptionEvent)` would after the user re-picks an already-doubled
   * institution from either dropdown. Half go through `onPartnerSelect` (ToC dropdown re-pick —
   * drops the ToC copy since it's already in "Other(s)"); half through `onOtherPartnerSelect`
   * ("Other(s)" dropdown re-pick — drops the "Other(s)" copy since it's already in the ToC bucket).
   * Both handlers are exercised, per the Reviewer's remediation.
   */
  const resolveAllSixViaHandlers = () => {
    const component = fixture.componentInstance;
    const [viaToc, viaOther] = [SIX_IDS.slice(0, 3), SIX_IDS.slice(3)];
    viaToc.forEach(id => component.onPartnerSelect({ option: { institutions_id: id } }));
    viaOther.forEach(id => component.onOtherPartnerSelect({ option: { institutions_id: id } }));
  };

  const assertNoCrossBucketDuplicateAndSixTotal = () => {
    const tocIds: number[] = rdPartnersSE.partnersBody.institutions
      .filter((i: any) => i.institutions_id !== rdPartnersSE.OTHER_PARTNERS_CODE)
      .map((i: any) => i.institutions_id);
    const otherIds: number[] = rdPartnersSE.otherPartnersSelected.map((i: any) => i.institutions_id);

    // No institution ends up selected in both buckets.
    const intersection = tocIds.filter(id => otherIds.includes(id));
    expect(intersection).toEqual([]);

    // The combined selected count stays 6, not 12.
    expect(tocIds.length + otherIds.length).toBe(6);
    expect(fixture.componentInstance.allSelectedPartners.length).toBe(6);
    expect(new Set([...tocIds, ...otherIds])).toEqual(new Set(SIX_IDS));
  };

  it('setup() (default/W1-W2 host): resolves the 6-doubled repro to 6 uniquely-bucketed institutions', () => {
    setup();
    expect(fixture.componentInstance.variant).toBe('default');

    resolveAllSixViaHandlers();

    assertNoCrossBucketDuplicateAndSixTotal();
  });

  it("setup('ipsr') (IPSR host, ipsr-contributors.component.html:284): resolves the same repro identically", () => {
    setup('ipsr');
    expect(fixture.nativeElement.classList.contains('ipsr-variant')).toBe(true);

    resolveAllSixViaHandlers();

    assertNoCrossBucketDuplicateAndSixTotal();
  });
});
