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
      buildOtherPartnersSentinel: () => ({ institutions_id: -1, full_name: 'Other' }),
      partnersBody: {
        institutions: [],
        no_applicable_partner: false,
        result_toc_result: { planned_result: opts.plannedResult }
      },
      otherPartnersSelected: [],
      setPossibleLeadPartners: jest.fn(),
      validateDeliverySelectionPartners: () => false,
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
