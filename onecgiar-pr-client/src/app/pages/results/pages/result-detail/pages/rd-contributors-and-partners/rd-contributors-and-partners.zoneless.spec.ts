import { NO_ERRORS_SCHEMA, provideZonelessChangeDetection, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';

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
 * P2-3322 — zoneless change detection regression guard for the Lead center / Lead partner selects.
 *
 * `RdContributorsAndPartnersService.updatingLeadData` is raised to hide the select while the possible-leads
 * list is recomputed and cleared again inside a `setTimeout(..., 25)`. That delayed write notified nothing,
 * so under zoneless change detection the select stayed hidden behind `*ngIf="!updatingLeadData"` until the
 * page was reloaded. These tests use the REAL service, drive a real DOM click and assert on the rendered DOM.
 */
describe('RdContributorsAndPartnersComponent — lead selects under zoneless change detection', () => {
  let fixture: ComponentFixture<RdContributorsAndPartnersComponent>;
  let rdPartnersSE: RdContributorsAndPartnersService;

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
    const currentResult = {
      id: 1,
      result_code: 'R-1',
      version_id: 1,
      portfolio: 'P25',
      initiative_id: 5,
      initiative_official_code: 'INIT-05',
      status: null
    };

    const apiMock = {
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
        GET_ClarisaProjects: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: { readOnly: false, isAdmin: false, platformIsClosed: false }
    };

    await TestBed.configureTestingModule({
      declarations: [RdContributorsAndPartnersComponent],
      imports: [CommonModule, TermPipe],
      providers: [
        provideZonelessChangeDetection(),
        RdContributorsAndPartnersService,
        { provide: ApiService, useValue: apiMock },
        { provide: RolesService, useValue: { readOnly: false } },
        {
          provide: InstitutionsService,
          useValue: { loadedInstitutions: new BehaviorSubject<boolean>(false), institutionsList: [], institutionsWithoutCentersList: [] }
        },
        { provide: CentersService, useValue: { loadedCenters: new BehaviorSubject<boolean>(false), centersList } },
        { provide: CustomizedAlertsFeService, useValue: { show: jest.fn() } },
        { provide: ResultLevelService, useValue: { currentResultLevelId: 2 } },
        { provide: InnovationUseResultsService, useValue: { resultsList: [] } },
        {
          provide: FieldsManagerService,
          useValue: { isContributorsPartners2026: () => false, isP25: () => true, activeIndicatorsLength: () => 0, hasSelectedIndicator: () => false }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    rdPartnersSE = TestBed.inject(RdContributorsAndPartnersService);
    jest.spyOn(rdPartnersSE, 'getSectionInformation').mockImplementation(() => undefined as any);
    jest.spyOn(rdPartnersSE, 'loadFilteredBilateralProjects').mockImplementation(() => undefined as any);

    fixture = TestBed.createComponent(RdContributorsAndPartnersComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    // `ngOnInit` calls `resetState()`, so the precondition (one contributing center, lead by center) is seeded
    // afterwards. Setup only — the assertion below is driven by a real DOM click.
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

    expect(rdPartnersSE.updatingLeadData).toBe(false);
    expect(leadCenterSelectEl()).toBeTruthy();
  });

  it('re-shows the Lead center select after deleteContributingCenter(index, true)', async () => {
    expect(leadCenterSelectEl()).toBeTruthy();

    // The `updateComponent = true` branch owns its own `setTimeout(..., 50)` on the same flag.
    fixture.componentInstance.deleteContributingCenter(0, true);
    await fixture.whenStable();

    expect(leadCenterSelectEl()).toBeFalsy();

    await tick(120);

    expect(rdPartnersSE.updatingLeadData).toBe(false);
    expect(leadCenterSelectEl()).toBeTruthy();
  });
});
