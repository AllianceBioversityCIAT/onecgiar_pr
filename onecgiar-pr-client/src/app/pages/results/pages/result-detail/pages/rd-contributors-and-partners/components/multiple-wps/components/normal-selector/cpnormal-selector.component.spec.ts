import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform, provideZonelessChangeDetection, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CPNormalSelectorComponent } from './normal-selector.component';
import { ApiService } from '../../../../../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../../../../../shared/services/global/roles.service';
import { RdContributorsAndPartnersService } from '../../../../rd-contributors-and-partners.service';
import { InstitutionsService } from '../../../../../../../../../../shared/services/global/institutions.service';
import { GreenChecksService } from '../../../../../../../../../../shared/services/global/green-checks.service';
import { DataControlService } from '../../../../../../../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../../../../../../../shared/services/fields-manager.service';

/**
 * P2-3335 — the External Partners catalogue arrives after the screen is drawn.
 *
 * `referenceExternalPartners` and `otherPartnersList` are `computed()`. While they read the service's plain
 * array, their first evaluation cached an empty list and never recomputed when the HTTP response landed — a
 * plain array is not a reactive dependency — so "Other(s) External Partners" showed "No information found"
 * for good even though the server had returned the whole catalogue. These tests drive that exact order:
 * read the lists BEFORE the catalogue resolves, then publish it and read again.
 */
describe('CPNormalSelectorComponent — catalogue arriving after first read (P2-3335)', () => {
  let component: CPNormalSelectorComponent;
  let institutionsSE: InstitutionsService;

  const partner = (id: number, name: string) => ({
    institutions_id: id,
    institutions_name: name,
    full_name: name,
    obj_institutions: { name, obj_institution_type_code: { name: 'NGO', id: 1 } }
  });

  const TOC_PARTNER = partner(10, 'Partner from the ToC');
  const OTHER_A = partner(20, 'Other partner A');
  const OTHER_B = partner(30, 'Other partner B');

  beforeEach(() => {
    const institutionsMock = {
      institutionsWithoutCentersListPartners: [],
      institutionsWithoutCentersPartners: signal<any[]>([])
    };

    const rdPartnersMock = {
      OTHER_PARTNERS_CODE: -1,
      tocReferencePartnerInstitutionIds: signal<number[]>([10]),
      buildOtherPartnersSentinel: () => ({ institutions_id: -1, full_name: 'Other' }),
      partnersBody: { institutions: [] }
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        CPNormalSelectorComponent,
        { provide: ApiService, useValue: { dataControlSE: { currentResult: { result_code: 'R-1', version_id: 1 } } } },
        { provide: RolesService, useValue: { readOnly: false } },
        { provide: RdContributorsAndPartnersService, useValue: rdPartnersMock },
        { provide: InstitutionsService, useValue: institutionsMock },
        { provide: GreenChecksService, useValue: {} },
        { provide: DataControlService, useValue: { isKnowledgeProduct: false } },
        { provide: FieldsManagerService, useValue: { isContributorsPartners2026: () => true } }
      ]
    });

    component = TestBed.inject(CPNormalSelectorComponent);
    institutionsSE = TestBed.inject(InstitutionsService);
  });

  /** Publishes the catalogue the way the service does: plain array and signal written together. */
  const catalogueArrives = (list: any[]) => {
    (institutionsSE as any).institutionsWithoutCentersListPartners = list;
    institutionsSE.institutionsWithoutCentersPartners.set(list);
  };

  it('fills the "Other(s)" list once the catalogue arrives, even when read while still empty', () => {
    // First read happens before the response lands — this is what used to poison the cached value.
    expect(component.otherPartnersList()).toEqual([]);

    catalogueArrives([TOC_PARTNER, OTHER_A, OTHER_B]);

    expect(component.otherPartnersList().map((i: any) => i.institutions_id)).toEqual([20, 30]);
  });

  it('fills the ToC-referenced list once the catalogue arrives, even when read while still empty', () => {
    expect(component.referenceExternalPartners()).toEqual([]);

    catalogueArrives([TOC_PARTNER, OTHER_A, OTHER_B]);

    expect(component.referenceExternalPartners().map((i: any) => i.institutions_id)).toEqual([10]);
  });

  it('reports that the ToC brought partners only after the catalogue resolves', () => {
    // The AC4 empty-state note depends on this, so a stale cache also showed the wrong note.
    expect(component.hasReferencePartners()).toBe(false);

    catalogueArrives([TOC_PARTNER, OTHER_A]);

    expect(component.hasReferencePartners()).toBe(true);
  });

  it('keeps the "Other" sentinel at the end of the first dropdown once the catalogue resolves', () => {
    catalogueArrives([TOC_PARTNER, OTHER_A]);

    const options = component.dropdown1OptionsPartners();
    expect(options.map((o: any) => o.institutions_id)).toEqual([10, -1]);
  });

  it('still recomputes when the ToC selection changes after the catalogue is loaded', () => {
    catalogueArrives([TOC_PARTNER, OTHER_A, OTHER_B]);
    expect(component.otherPartnersList().map((i: any) => i.institutions_id)).toEqual([20, 30]);

    // Picking a different ToC node must move a partner from one list to the other.
    (TestBed.inject(RdContributorsAndPartnersService) as any).tocReferencePartnerInstitutionIds.set([20]);

    expect(component.referenceExternalPartners().map((i: any) => i.institutions_id)).toEqual([20]);
    expect(component.otherPartnersList().map((i: any) => i.institutions_id)).toEqual([10, 30]);
  });
});

/**
 * PRS (partner-role-separator) — DOM tests for the labelled role group in BOTH duplicated
 * selected-partner blocks (ToC partners + "Other(s)" External Partners).
 *
 * Gates PRS-R-1..3: label + group per block, aria-pressed reflecting selection, unchanged
 * click delegation to `onSelectDeliveryPartners`, and the read-only collapse with no orphan
 * divider element (the divider is a border on `.role_group`, never a standalone node).
 */
@Pipe({ name: 'countInstitutionsTypes', standalone: false })
class CountInstitutionsTypesStubPipe implements PipeTransform {
  transform(value: any[]): any[] {
    return value || [];
  }
}

describe('CPNormalSelectorComponent — partner role group DOM (PRS-R-1..3)', () => {
  let fixture: ComponentFixture<CPNormalSelectorComponent>;
  let rdPartnersMock: any;
  let tocOption: any;
  let otherOption: any;

  const delivery = (id: number) => ({ partner_delivery_type_id: id });

  const chipOption = (id: number, name: string, deliveries: any[]) => ({
    institutions_id: id,
    institutions_name: name,
    full_name: name,
    delivery: deliveries,
    obj_institutions: { name, obj_institution_type_code: { name: 'NGO', id: 1 } }
  });

  /**
   * Renders the component with ONE chip in the ToC block and ONE in the "Other(s)" block.
   * The catalogue stays empty so `hasReferencePartners()` is false and the Other(s) block
   * auto-opens (AC4 path) — both duplicated blocks are in the DOM at once.
   */
  const setup = (opts: { readOnly?: boolean; tocDeliveries?: any[]; otherDeliveries?: any[] } = {}) => {
    tocOption = chipOption(10, 'ToC partner', opts.tocDeliveries ?? []);
    otherOption = chipOption(20, 'Other partner', opts.otherDeliveries ?? []);

    rdPartnersMock = {
      OTHER_PARTNERS_CODE: -1,
      toggle: 0,
      tocReferencePartnerInstitutionIds: signal<number[]>([]),
      buildOtherPartnersSentinel: () => ({ institutions_id: -1, full_name: 'Other' }),
      partnersBody: { institutions: [tocOption], no_applicable_partner: false },
      otherPartnersSelected: [otherOption],
      validateDeliverySelectionPartners: (deliveries: any, deliveryId: number) => {
        if (!Array.isArray(deliveries)) return false;
        return deliveries.find((d: any) => d.partner_delivery_type_id == deliveryId);
      },
      onSelectDeliveryPartners: jest.fn(),
      removePartner: jest.fn(),
      setPossibleLeadPartners: jest.fn()
    };

    TestBed.configureTestingModule({
      declarations: [CPNormalSelectorComponent, CountInstitutionsTypesStubPipe],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiService, useValue: { dataControlSE: { currentResult: { result_code: 'R-1', version_id: 1 } } } },
        { provide: RolesService, useValue: { readOnly: opts.readOnly ?? false } },
        { provide: RdContributorsAndPartnersService, useValue: rdPartnersMock },
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

    fixture = TestBed.createComponent(CPNormalSelectorComponent);
    fixture.detectChanges();
  };

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const blocks = (): HTMLElement[] => Array.from(el().querySelectorAll('.chips_container'));

  it('renders the "Partner role" label once per selected-partner row, in BOTH blocks', () => {
    setup();

    const containers = blocks();
    expect(containers.length).toBe(2); // ToC block + Other(s) block

    containers.forEach(container => {
      const labels = Array.from(container.querySelectorAll('.role_label'));
      expect(labels.length).toBe(1); // one chip per block in this setup
      expect(labels[0].textContent?.trim()).toBe('Partner role');
    });
  });

  it('exposes role="group" with the accessible name on the role zone of BOTH blocks', () => {
    setup();

    blocks().forEach(container => {
      const groups = Array.from(container.querySelectorAll('[role="group"]'));
      expect(groups.length).toBe(1);
      expect(groups[0].getAttribute('aria-label')).toBe('Partner role in delivering the result');
      // The pills live INSIDE the labelled group.
      expect(groups[0].querySelectorAll('.delivery').length).toBe(4);
    });
  });

  it('renders aria-pressed reflecting each pill selection state, per block', () => {
    setup({ tocDeliveries: [delivery(1)], otherDeliveries: [delivery(2)] });

    const [tocBlock, otherBlock] = blocks();
    const pressed = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('.delivery')).map(pill => pill.getAttribute('aria-pressed'));

    // Pills render in Scaling(1), Demand(2), Innovation(3), Other(4) order.
    expect(pressed(tocBlock)).toEqual(['true', 'false', 'false', 'false']);
    expect(pressed(otherBlock)).toEqual(['false', 'true', 'false', 'false']);
  });

  it('toggles aria-pressed when the selection state changes', () => {
    setup();

    const scalingPill = () => blocks()[0].querySelector('.delivery') as HTMLElement;
    expect(scalingPill().getAttribute('aria-pressed')).toBe('false');

    tocOption.delivery = [delivery(1)];
    // Zoneless CD: a plain-property mutation does not mark the view dirty on its own.
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(scalingPill().getAttribute('aria-pressed')).toBe('true');
    expect(scalingPill().classList.contains('active')).toBe(true);
  });

  it('still delegates pill clicks to onSelectDeliveryPartners with the same (option, id) args, in BOTH blocks', () => {
    setup();

    const [tocBlock, otherBlock] = blocks();
    const tocPills = Array.from(tocBlock.querySelectorAll('.delivery')) as HTMLElement[];
    const otherPills = Array.from(otherBlock.querySelectorAll('.delivery')) as HTMLElement[];

    tocPills[0].click(); // Scaling
    expect(rdPartnersMock.onSelectDeliveryPartners).toHaveBeenCalledWith(tocOption, 1);

    otherPills[1].click(); // Demand
    expect(rdPartnersMock.onSelectDeliveryPartners).toHaveBeenCalledWith(otherOption, 2);

    // Payload untouched by the restructure: the handler receives the SAME option object (identity),
    // and nothing mutated the deliveries as a side effect of clicking.
    expect(rdPartnersMock.onSelectDeliveryPartners.mock.calls[0][0]).toBe(tocOption);
    expect(rdPartnersMock.onSelectDeliveryPartners.mock.calls[1][0]).toBe(otherOption);
    expect(tocOption.delivery).toEqual([]);
    expect(otherOption.delivery).toEqual([]);
  });

  it('in read-only mode keeps the label and renders ONLY the selected pill, with no orphan divider element', () => {
    setup({ readOnly: true, tocDeliveries: [delivery(1)], otherDeliveries: [delivery(3)] });

    const containers = blocks();
    expect(containers.length).toBe(2);

    const expectedText = ['Scaling', 'Innovation'];
    containers.forEach((container, index) => {
      // Label + group survive the read-only collapse.
      expect(container.querySelectorAll('.role_label').length).toBe(1);
      expect(container.querySelectorAll('[role="group"]').length).toBe(1);

      // Only the selected pill remains, marked pressed.
      const pills = Array.from(container.querySelectorAll('.delivery'));
      expect(pills.length).toBe(1);
      expect(pills[0].textContent?.trim()).toBe(expectedText[index]);
      expect(pills[0].getAttribute('aria-pressed')).toBe('true');

      // No delete icon and no standalone divider node (the divider is a border on .role_group).
      expect(container.querySelectorAll('i.material-icons-round').length).toBe(0);
      expect(container.querySelectorAll('hr, .divider').length).toBe(0);
    });
  });
});
