import { Component, Input, NO_ERRORS_SCHEMA, provideZonelessChangeDetection, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { RdContributorsAndPartnersComponent } from './rd-contributors-and-partners.component';
import { RdContributorsAndPartnersService } from './rd-contributors-and-partners.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { ResultLevelService } from '../../../result-creator/services/result-level.service';
import { InnovationUseResultsService } from '../../../../../../shared/services/global/innovation-use-results.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { TermPipe } from '../../../../../../internationalization/term.pipe';

/**
 * P2-2911 AC2 — "The Lead Contact Person field is displayed in the Contributors and Partners
 * section", next to Lead center.
 *
 * ⚠️ These tests assert on the RENDERED DOM, never on a component property. The client is zoneless:
 * `leadContactBody` is a signal reassigned with a fresh object (the field's `ngOnChanges` only fires
 * on a reference change), and a test that read the property back would pass even if the value never
 * reached the template. `LeadContactPersonFieldStub` therefore projects what it receives through
 * `[body]` into the DOM, so the binding itself is what is under test.
 */
@Component({
  selector: 'app-lead-contact-person-field',
  standalone: true,
  template: `<span class="stub-contact-name">{{ body?.lead_contact_person }}</span
    ><span class="stub-contact-mail">{{ body?.lead_contact_person_data?.mail }}</span
    ><span class="stub-readonly">{{ readOnly }}</span
    ><span class="stub-required">{{ required }}</span>`
})
class LeadContactPersonFieldStub {
  @Input() body: any;
  @Input() required = false;
  @Input() readOnly = false;
}

describe('RdContributorsAndPartnersComponent — Lead contact person (P2-2911 AC2)', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let apiMock: any;

  const centersList = [{ code: 'C1', name: 'Center 1', full_name: 'Center 1', institutionId: 11 }];

  const generalInfoResponse: any = {
    lead_contact_person: 'Jane Doe',
    lead_contact_person_data: { display_name: 'Jane Doe', mail: 'j.doe@cgiar.org', title: 'Scientist' }
  };

  const fieldEl = () => fixture.nativeElement.querySelector('[data-testid="cp-lead-contact-person"] app-lead-contact-person-field');
  const leadCenterEl = () => fixture.nativeElement.querySelector('app-pr-select[label="Lead center"]');
  const text = (selector: string) => fixture.nativeElement.querySelector(selector)?.textContent?.trim();

  const build = async (generalInfo$: any = of({ response: generalInfoResponse }), is2026 = true) => {
    const currentResult = {
      id: 1,
      result_code: 'R-1',
      version_id: 1,
      portfolio: 'P25',
      initiative_id: 5,
      initiative_official_code: 'INIT-05',
      status: null
    };

    apiMock = {
      dataControlSE: {
        currentResult,
        currentResultSignal: signal(currentResult),
        currentResultSectionName: signal(''),
        findClassTenSeconds: jest.fn().mockResolvedValue(true),
        isKnowledgeProduct: false,
        showPartnersRequest: false
      },
      resultsSE: {
        GET_resultById: jest.fn().mockReturnValue(of({ response: currentResult })),
        GET_AllWithoutResults: jest.fn().mockReturnValue(of({ response: [] })),
        GET_AllInitiatives: jest.fn().mockReturnValue(of({ response: [] })),
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] })),
        GET_generalInformationByResultId: jest.fn().mockReturnValue(generalInfo$)
      },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [CommonModule, TermPipe, LeadContactPersonFieldStub],
      providers: [
        provideZonelessChangeDetection(),
        RdContributorsAndPartnersService,
        { provide: ApiService, useValue: apiMock },
        { provide: RolesService, useValue: { readOnly: false } },
        {
          provide: InstitutionsService,
          useValue: { loadedInstitutions: new BehaviorSubject<boolean>(false), institutionsList: [], institutionsWithoutCentersList: [] }
        },
        {
          provide: CentersService,
          useValue: {
            loadedCenters: new BehaviorSubject<boolean>(false),
            centersList,
            centers: signal(centersList),
            getData: jest.fn().mockResolvedValue([])
          }
        },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: ResultLevelService, useValue: { currentResultLevelId: 2 } },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        {
          provide: FieldsManagerService,
          useValue: {
            isContributorsPartners2026: () => is2026,
            isP25: () => true,
            isLeadContactPersonMandatory2026: () => true,
            activeIndicatorsLength: () => 0,
            hasSelectedIndicator: () => false
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    jest.spyOn(rdPartnersSE, 'getSectionInformation').mockImplementation(() => undefined as any);
    jest.spyOn(rdPartnersSE, 'loadFilteredBilateralProjects').mockImplementation(() => undefined as any);

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => {
    TestBed.resetTestingModule();
    jest.restoreAllMocks();
  });

  it('renders the Lead contact person field in the section, right after Lead center', async () => {
    await build();

    // 🛑 The assertion that fails before the move: the field only existed in General Information.
    expect(fieldEl()).toBeTruthy();

    // "next to the Lead centre": same parent, and the contact block follows the lead-center block.
    const blocks = Array.from(fixture.nativeElement.querySelectorAll('.detail_container > div')) as HTMLElement[];
    const leadCenterBlock = leadCenterEl()?.closest('.mt-16');
    const contactBlock = fixture.nativeElement.querySelector('[data-testid="cp-lead-contact-person"]');
    expect(leadCenterBlock).toBeTruthy();
    expect(blocks.indexOf(contactBlock)).toBe(blocks.indexOf(leadCenterBlock as HTMLElement) + 1);
  });

  it('shows the stored contact name and email, loaded through the General Information GET', async () => {
    await build();

    expect(apiMock.resultsSE.GET_generalInformationByResultId).toHaveBeenCalledWith(true);
    expect(text('.stub-contact-name')).toBe('Jane Doe');
    expect(text('.stub-contact-mail')).toBe('j.doe@cgiar.org');
  });

  it('renders read-only, and carries the same mandatory marker General Information uses', async () => {
    await build();

    // Read-only is what keeps this from becoming a mandatory field with no write path: the
    // Contributors & Partners endpoint accepts neither key, so an editable copy would drop input.
    expect(text('.stub-readonly')).toBe('true');
    expect(text('.stub-required')).toBe('true');
  });

  it('does NOT render on a phase-2025 result — the relocation is part of the 2026 redesign of this section', async () => {
    // 🛑 Phase, not portfolio: this fixture is P25 AND phase 2025, the combination that exists in
    // prtest. A portfolio gate would have added the field to the legacy 2025 form.
    await build(of({ response: generalInfoResponse }), false);

    expect(fieldEl()).toBeNull();
    expect(leadCenterEl()).toBeTruthy();
  });

  it('still renders the section when the contact GET fails', async () => {
    await build(throwError(() => new Error('boom')));

    expect(fieldEl()).toBeTruthy();
    expect(text('.stub-contact-name')).toBe('');
    expect(leadCenterEl()).toBeTruthy();
  });
});
