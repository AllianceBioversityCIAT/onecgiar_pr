import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';

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
