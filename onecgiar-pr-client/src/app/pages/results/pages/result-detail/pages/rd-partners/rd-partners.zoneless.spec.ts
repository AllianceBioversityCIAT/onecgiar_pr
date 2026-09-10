import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

import { RdPartnersComponent } from './rd-partners.component';
import { RdPartnersService } from './rd-partners.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { CentersService } from '../../../../../../shared/services/global/centers.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';

/**
 * P2-3322 — zoneless regression guard for the Lead center / Lead partner selects on the P22 Partners
 * section. Mirrors `../rd-contributors-and-partners/rd-contributors-and-partners.zoneless.spec.ts`,
 * which guards the twin service serving the P25 and IPSR pages.
 *
 * `RdPartnersService.updatingLeadData` is raised to hide the select while the possible-leads list is
 * recomputed, and cleared again inside a `setTimeout(..., 25)`. That delayed write notifies nothing,
 * so under zoneless change detection the select stays hidden behind `*ngIf="!updatingLeadData"`.
 *
 * 🛑 These assert on the RENDERED select, never on the flag. The flag flips either way — that is
 * precisely why a flag-based assertion passes with the bug present. This is also why the previous
 * mechanism (`ViewRefreshService.schedule()` → `ApplicationRef.tick()`) could not be covered: a root
 * tick is not something a TestBed fixture can be driven by. Revert the service and these must fail.
 */
describe('RdPartnersComponent — lead selects under zoneless change detection', () => {
  let fixture: ComponentFixture<RdPartnersComponent>;
  let rdPartnersSE: RdPartnersService;

  const centersList = [
    { code: 'C1', name: 'Center 1', full_name: 'Center 1', institutionId: 11 },
    { code: 'C2', name: 'Center 2', full_name: 'Center 2', institutionId: 22 }
  ];

  const leadCenterSelectEl = () => fixture.nativeElement.querySelector('app-pr-select[label="Lead center"]');
  const centerChipDeleteEl = () => fixture.nativeElement.querySelector('.centers .center .material-icons-round');

  const tick = async (ms: number) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    const currentResult = { id: 1, result_code: 'R-1', version_id: 1, portfolio: 'P22', status: null };

    const apiMock = {
      dataControlSE: {
        currentResult,
        currentResultSignal: signal(currentResult),
        currentResultSectionName: signal(''),
        findClassTenSeconds: jest.fn().mockResolvedValue(true),
        isKnowledgeProduct: false,
        showPartnersRequest: false
      },
      resultsSE: { GET_resultById: jest.fn().mockReturnValue(of({ response: currentResult })) },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    await TestBed.configureTestingModule({
      declarations: [RdPartnersComponent],
      imports: [CommonModule],
      providers: [
        provideZonelessChangeDetection(),
        RdPartnersService,
        { provide: ApiService, useValue: apiMock },
        { provide: RolesService, useValue: { readOnly: false } },
        {
          provide: InstitutionsService,
          useValue: { loadedInstitutions: new BehaviorSubject<boolean>(false), institutionsList: [], institutionsWithoutCentersList: [] }
        },
        { provide: CentersService, useValue: { loadedCenters: new BehaviorSubject<boolean>(false), centersList, centers: signal(centersList) } },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    rdPartnersSE = TestBed.inject(RdPartnersService);
    jest.spyOn(rdPartnersSE, 'getSectionInformation').mockImplementation(() => undefined as any);

    fixture = TestBed.createComponent(RdPartnersComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    // `ngOnInit` replaces `partnersBody`, so the precondition is seeded afterwards. Setup only —
    // the assertions below are driven by a real DOM click.
    rdPartnersSE.partnersBody.contributing_center = [{ ...centersList[0] } as any];
    rdPartnersSE.partnersBody.is_lead_by_partner = false;
    rdPartnersSE.possibleLeadCenters = [{ ...centersList[0] } as any];
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('re-shows the Lead center select after removing a contributing center chip', async () => {
    expect(leadCenterSelectEl()).toBeTruthy();
    expect(centerChipDeleteEl()).toBeTruthy();

    // Real flow: `(click)="deleteContributingCenter(i); rdPartnersSE.setPossibleLeadCenters(true)"`.
    centerChipDeleteEl().click();
    await fixture.whenStable();

    // The service hides the select synchronously before recomputing the possible leads.
    expect(leadCenterSelectEl()).toBeFalsy();

    await tick(80);

    expect(leadCenterSelectEl()).toBeTruthy();
  });

  it('re-shows the Lead center select after deleteContributingCenter(index, true)', async () => {
    expect(leadCenterSelectEl()).toBeTruthy();

    fixture.componentInstance.deleteContributingCenter(0, true);
    await fixture.whenStable();

    await tick(120);

    expect(leadCenterSelectEl()).toBeTruthy();
  });

  it('re-shows the Lead partner select after setPossibleLeadPartners(true)', async () => {
    rdPartnersSE.partnersBody.is_lead_by_partner = true;
    rdPartnersSE.possibleLeadPartners = [{ institutions_id: 11, full_name: 'Partner 1' } as any];
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-pr-select[label="Lead partner"]')).toBeTruthy();

    rdPartnersSE.setPossibleLeadPartners(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-pr-select[label="Lead partner"]')).toBeFalsy();

    await tick(80);

    expect(fixture.nativeElement.querySelector('app-pr-select[label="Lead partner"]')).toBeTruthy();
  });
});
