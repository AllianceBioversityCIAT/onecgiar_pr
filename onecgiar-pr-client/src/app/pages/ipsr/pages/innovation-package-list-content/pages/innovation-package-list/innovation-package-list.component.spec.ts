import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../../../shared/services/global/phases.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { IpsrListService } from './services/ipsr-list.service';
import { IpsrListFilterService } from './services/ipsr-list-filter.service';

import { InnovationPackageListComponent } from './innovation-package-list.component';
import { InnovationPackageCustomTableComponent } from './components/innovation-package-custom-table/innovation-package-custom-table.component';
import { IpsrListFiltersComponent } from './components/ipsr-list-filters/ipsr-list-filters.component';
import { PrButtonComponent } from '../../../../../../custom-fields/pr-button/pr-button.component';
import { SectionHeaderComponent } from '../../../../components/section-header/section-header.component';
import { InnovationPackageListFilterPipe } from './components/innovation-package-custom-table/pipes/innovation-package-list-filter.pipe';
import { UpdateIpsrResultModalComponent } from './components/update-ipsr-result-modal/update-ipsr-result-modal.component';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';
import { IpsrToUpdateFilterPipe } from './components/update-ipsr-result-modal/ipsr-to-update-filter.pipe';
import { ChangePhaseModalComponent } from '../../../../../../shared/components/change-phase-modal/change-phase-modal.component';

describe('InnovationPackageListComponent', () => {
  let component: InnovationPackageListComponent;
  let fixture: ComponentFixture<InnovationPackageListComponent>;
  let apiService: ApiService;
  let ipsrDataControlSE: IpsrDataControlService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        InnovationPackageListComponent,
        IpsrToUpdateFilterPipe,
        InnovationPackageCustomTableComponent,
        ChangePhaseModalComponent,
        IpsrListFiltersComponent,
        PrButtonComponent,
        SectionHeaderComponent,
        InnovationPackageListFilterPipe,
        UpdateIpsrResultModalComponent,
        PrFieldHeaderComponent
      ],
      providers: [
        ApiService,
        PhasesService,
        IpsrDataControlService,
        IpsrListService,
        IpsrListFilterService,

        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => {
                  return 'id';
                }
              }
            }
          }
        }
      ],
      // `RouterTestingModule` registers a real `RouterLink` directive so the "Create" anchor's
      // `[routerLink]` binding actually resolves to a real `href` — required for a genuine
      // (non-dead) assertion on the gating tests below (IPSR-T-7, closing IPSR-T-6's ADVISORY).
      imports: [HttpClientTestingModule, RouterTestingModule.withRoutes([])]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationPackageListComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService);
    ipsrDataControlSE = TestBed.inject(IpsrDataControlService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call deselectInits on ngOnInit if isAdmin', () => {
    jest.spyOn(component, 'deselectInits');
    component.api.rolesSE.isAdmin = true;
    component.ngOnInit();
    expect(component.deselectInits).toHaveBeenCalled();
  });

  it('should not call deselectInits on ngOnInit if not isAdmin', () => {
    jest.spyOn(component, 'deselectInits');
    component.api.rolesSE.isAdmin = false;
    component.ngOnInit();
    expect(component.deselectInits).not.toHaveBeenCalled();
  });

  it('should set selected property equal to item.status on ngOnInit for all phases', () => {
    const phases: any = [
      {
        status: true,
        is_active: true,
        created_date: '2024-02-21T13:42:17.473Z',
        last_updated_date: '2024-02-21T13:42:17.473Z',
        created_by: 'user'
      },
      {
        status: false,
        is_active: true,
        created_date: '2024-02-21T13:42:17.473Z',
        last_updated_date: '2024-02-21T13:42:17.473Z',
        created_by: 'user'
      }
    ];

    component.phaseServices.phases.ipsr = phases;

    component.ngOnInit();

    component.phaseServices.phases.ipsr.forEach(item => (item.selected = item.status));

    expect(component.phaseServices.phases.ipsr).toEqual([
      {
        status: true,
        is_active: true,
        created_date: '2024-02-21T13:42:17.473Z',
        last_updated_date: '2024-02-21T13:42:17.473Z',
        created_by: 'user',
        selected: true
      },
      {
        status: false,
        is_active: true,
        created_date: '2024-02-21T13:42:17.473Z',
        last_updated_date: '2024-02-21T13:42:17.473Z',
        created_by: 'user',
        selected: false
      }
    ]);
  });

  it('should call GETAllInnovationPackages on ngOnInit', () => {
    jest.spyOn(component, 'GETAllInnovationPackages');
    component.ngOnInit();
    expect(component.GETAllInnovationPackages).toHaveBeenCalled();
  });

  it('should set ipsrResultList on GETAllInnovationPackages', () => {
    const response = [{}, {}];

    jest.spyOn(apiService.resultsSE, 'GETAllInnovationPackages').mockReturnValue(of({ response }));

    component.GETAllInnovationPackages();

    expect(ipsrDataControlSE.ipsrResultList).toEqual(response);
  });

  it('should populate statusOptions() from the loaded list on GETAllInnovationPackages (IPSR-T-1 forward pointer)', () => {
    const response = [
      { result_code: '1', title: 'Title 1', official_code: 'OC1', status: 'Shared' },
      { result_code: '2', title: 'Title 2', official_code: 'OC2', status: 'Editing' },
      { result_code: '3', title: 'Title 3', official_code: 'OC3', status: '' }
    ];

    jest.spyOn(apiService.resultsSE, 'GETAllInnovationPackages').mockReturnValue(of({ response }));

    expect(component.ipsrListFilterSE.statusOptions()).toEqual([]);

    component.GETAllInnovationPackages();

    expect(component.ipsrListFilterSE.statusOptions()).toEqual(['Shared', 'Editing']);
  });

  it('should update inno.full_name and inno.result_code on GETAllInnovationPackages', () => {
    const response = [
      { result_code: '1', title: 'Title 1', official_code: 'OC1' },
      { result_code: '2', title: 'Title 2', official_code: 'OC2' }
    ];

    component.ipsrDataControlSE.ipsrResultList = response;

    component.GETAllInnovationPackages();

    component.ipsrDataControlSE.ipsrResultList.forEach((inno: any) => {
      inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.official_code}`;
      inno.result_code = Number(inno.result_code);
    });

    expect(ipsrDataControlSE.ipsrResultList).toEqual([
      { result_code: 1, title: 'Title 1', official_code: 'OC1', full_name: '1 Title 1 OC1' },
      { result_code: 2, title: 'Title 2', official_code: 'OC2', full_name: '2 Title 2 OC2' }
    ]);
  });

  it('should return the joined text of initsSelectedJoinText', () => {
    const myInitiativesListIPSRByPortfolio = [{ selected: true }, { selected: false }];
    const options = [{ id: 1, attr: 'Phase 1', name: 'Phase 1 (Open)', selected: true }];
    const expectedJoinText = JSON.stringify([...myInitiativesListIPSRByPortfolio, ...options]);
    component.api.dataControlSE.myInitiativesListIPSRByPortfolio = myInitiativesListIPSRByPortfolio;
    component.ipsrListFilterSE.phaseOptions.set(options);

    expect(component.initsSelectedJoinText).toEqual(expectedJoinText);
  });

  it('should return true for everyDeselected when all items are deselected', () => {
    component.api.dataControlSE.myInitiativesListIPSRByPortfolio = [{ selected: false }, { selected: false }];

    expect(component.everyDeselected).toBe(true);
  });

  it('should set selected property to false for all items on deselectInits', () => {
    const myInitiativesListIPSRByPortfolio = [{ selected: true }, { selected: true }];

    component.api.dataControlSE.myInitiativesListIPSRByPortfolio = myInitiativesListIPSRByPortfolio;
    component.deselectInits();

    expect(component.api.dataControlSE.myInitiativesListIPSRByPortfolio).toEqual([{ selected: false }, { selected: false }]);
  });

  it('should set selected property to true for all items on ngOnDestroy', () => {
    const myInitiativesListIPSRByPortfolio = [{ selected: false }, { selected: false }];

    component.api.dataControlSE.myInitiativesListIPSRByPortfolio = myInitiativesListIPSRByPortfolio;
    component.ngOnDestroy();

    expect(component.api.dataControlSE.myInitiativesListIPSRByPortfolio).toEqual([{ selected: true }, { selected: true }]);
  });

  describe('checkIpsrReportingAccess() / ipsrReportingEnabled gating (IPSR-T-6 rework, IPSR-AC-7)', () => {
    beforeEach(() => {
      component.api.rolesSE.isAdmin = false;
      component.api.dataControlSE.reportingCurrentPhase.phaseId = 42;
      component.api.dataControlSE.myInitiativesListIPSRByPortfolio = [{ official_code: 'INIT-01', selected: true }];
    });

    it('sets ipsrReportingEnabled to false when the phase-reporting response disables the initiative', () => {
      jest.spyOn(apiService.resultsSE, 'GET_phaseReportingInitiatives').mockReturnValue(
        of({ response: { science_programs: [{ official_code: 'INIT-01', reporting_enabled: false }] } }) as any
      );

      (component as any).checkIpsrReportingAccess();

      expect(component.ipsrReportingEnabled).toBe(false);
    });

    it('sets ipsrReportingEnabled to true when the phase-reporting response enables the initiative', () => {
      jest.spyOn(apiService.resultsSE, 'GET_phaseReportingInitiatives').mockReturnValue(
        of({ response: { science_programs: [{ official_code: 'INIT-01', reporting_enabled: true }] } }) as any
      );

      (component as any).checkIpsrReportingAccess();

      expect(component.ipsrReportingEnabled).toBe(true);
    });

    it('IPSR-AC-7: with ipsrReportingEnabled false and a roleless/empty initiatives list, the Create/Update buttons are actually gated in the rendered template', () => {
      // A non-admin user with no role in the active portfolio: myInitiativesListIPSRByPortfolio is empty,
      // so `activeButtons` in the template evaluates false regardless of ipsrReportingEnabled.
      component.api.dataControlSE.myInitiativesListIPSRByPortfolio = [];
      component.ipsrReportingEnabled = false;
      component.api.rolesSE.platformIsClosed = false;

      fixture.detectChanges();

      const createAnchor: HTMLAnchorElement = fixture.nativeElement.querySelector('.ipsr_head__actions a');
      // Real check, replacing the dead `ng-reflect-router-link` assertion flagged by `IPSR-T-6`'s
      // Reviewer ADVISORY (structurally incapable of failing — no `RouterLink` was registered in
      // this TestBed and Angular 21 doesn't emit `ng-reflect-*` without one). `RouterTestingModule`
      // now registers the real `RouterLink` directive, so the rendered `href` reflects the actual
      // `[routerLink]="activeButtons ? '/ipsr/creator' : null"` binding — gated means no href.
      expect(createAnchor.getAttribute('href')).toBeFalsy();

      const buttons = fixture.nativeElement.querySelectorAll('.ipsr_btn');
      // Create (the anchor) and Update (the button) both carry the disabled class. The header was
      // rebuilt on 2026-09-17 — `app-pr-button` became a plain anchor/button pair — so the selectors
      // moved with it; what is asserted is unchanged.
      expect(buttons[0].classList.contains('ipsr_btn--disabled')).toBe(true);
      expect(buttons[1].classList.contains('ipsr_btn--disabled')).toBe(true);

      // Clicking Update must NOT open the update-result modal while gated.
      const updateButton: HTMLElement = buttons[1];
      updateButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(component.ipsrDataControlSE.ipsrUpdateResultModal).toBeFalsy();
    });

    it('renders a real routerLink href to /ipsr/creator when activeButtons is true (positive control for the href check above)', () => {
      component.api.dataControlSE.myInitiativesListIPSRByPortfolio = [{ official_code: 'INIT-01', selected: true }];
      component.ipsrReportingEnabled = true;
      component.api.rolesSE.platformIsClosed = false;

      fixture.detectChanges();

      const createAnchor: HTMLAnchorElement = fixture.nativeElement.querySelector('.ipsr_head__actions a');
      expect(createAnchor.getAttribute('href')).toContain('/ipsr/creator');
    });

    it('isolates the "&& ipsrReportingEnabled" conjunct: a NON-EMPTY initiatives list with ipsrReportingEnabled=false still gates the buttons (IPSR-T-6 forward pointer)', () => {
      // Unlike the rendered test above (which confounds gating with an EMPTY initiatives list), this
      // fixture keeps myInitiativesListIPSRByPortfolio non-empty, so only the `&& ipsrReportingEnabled`
      // conjunct itself can be responsible for the gate — the list-length half of the condition is true.
      component.api.dataControlSE.myInitiativesListIPSRByPortfolio = [{ official_code: 'INIT-01', selected: true }];
      component.ipsrReportingEnabled = false;
      component.api.rolesSE.platformIsClosed = false;

      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.ipsr_btn');
      expect(buttons[0].classList.contains('ipsr_btn--disabled')).toBe(true);
      expect(buttons[1].classList.contains('ipsr_btn--disabled')).toBe(true);
    });

    it('positive control: when activeButtons is true, clicking Update DOES open the update-result modal (IPSR-T-6 forward pointer)', () => {
      // Proves the click handler is actually wired, not just inert everywhere — the existing gated
      // test above only proves the click does nothing while gated, which is also true of a handler
      // that never fires at all.
      component.api.dataControlSE.myInitiativesListIPSRByPortfolio = [{ official_code: 'INIT-01', selected: true }];
      component.ipsrReportingEnabled = true;
      component.api.rolesSE.platformIsClosed = false;

      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('.ipsr_btn');
      expect(buttons[1].classList.contains('ipsr_btn--disabled')).toBe(false);

      const updateButton: HTMLElement = buttons[1];
      updateButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(component.ipsrDataControlSE.ipsrUpdateResultModal).toBe(true);
    });
  });

  describe('Filter narrowing via the rendered table pipe (IPSR-AC-1, IPSR-AC-2)', () => {
    function renderedTableCodes(field: string): string[] {
      const table = fixture.debugElement.query(By.directive(InnovationPackageCustomTableComponent))
        .componentInstance as InnovationPackageCustomTableComponent;
      return (table.tableData as any[]).map(row => row[field]).sort();
    }

    it('IPSR-AC-1: selecting two Program options narrows the rendered table to only those two initiatives\' packages', () => {
      ipsrDataControlSE.ipsrResultList = [
        { result_code: '1', full_name: '1 A OC1', official_code: 'INIT-01' },
        { result_code: '2', full_name: '2 B OC2', official_code: 'INIT-02' },
        { result_code: '3', full_name: '3 C OC3', official_code: 'INIT-03' }
      ];
      component.ipsrListFilterSE.selectedPrograms.set([
        { official_code: 'INIT-01', displayName: 'INIT-01' },
        { official_code: 'INIT-02', displayName: 'INIT-02' }
      ]);

      fixture.detectChanges();

      expect(renderedTableCodes('official_code')).toEqual(['INIT-01', 'INIT-02']);
    });

    it('IPSR-AC-2: selecting two Phase options shows packages from both phases simultaneously, not just one', () => {
      ipsrDataControlSE.ipsrResultList = [
        { result_code: '1', full_name: '1 A OC1', phase_name: 'Phase 1' },
        { result_code: '2', full_name: '2 B OC2', phase_name: 'Phase 2' },
        { result_code: '3', full_name: '3 C OC3', phase_name: 'Phase 3' }
      ];
      component.ipsrListFilterSE.selectedPhases.set([
        { attr: 'Phase 1', name: 'Phase 1 (Open)', id: 1, selected: true },
        { attr: 'Phase 2', name: 'Phase 2 (Closed)', id: 2, selected: false }
      ]);

      fixture.detectChanges();

      expect(renderedTableCodes('phase_name')).toEqual(['Phase 1', 'Phase 2']);
    });
  });

  describe('scoped-list regression (IPF-T-2)', () => {
    // The flat list has an extra INI-* entry the scoped (Science-Program) list does not carry.
    const flatOnlyEntry = { selected: true, code: 'INI-flat-only' };
    let flatMyInitiativesList: any[];
    let scopedMyInitiativesListIPSRByPortfolio: any[];

    beforeEach(() => {
      flatMyInitiativesList = [flatOnlyEntry, { selected: true, code: 'SP-shared' }];
      scopedMyInitiativesListIPSRByPortfolio = [{ selected: true, code: 'SP-shared' }];

      component.api.dataControlSE.myInitiativesList = flatMyInitiativesList;
      component.api.dataControlSE.myInitiativesListIPSRByPortfolio = scopedMyInitiativesListIPSRByPortfolio;
    });

    it('initsSelectedJoinText does not include the flat-only entry', () => {
      component.ipsrListFilterSE.phaseOptions.set([]);

      expect(component.initsSelectedJoinText).not.toContain('INI-flat-only');
      expect(component.initsSelectedJoinText).toEqual(JSON.stringify([...scopedMyInitiativesListIPSRByPortfolio, ...[]]));
    });

    it('everyDeselected reads only the scoped list', () => {
      // Scoped list fully deselected while the flat list still has a selected entry.
      scopedMyInitiativesListIPSRByPortfolio.forEach(item => (item.selected = false));

      expect(component.everyDeselected).toBe(true);
      expect(flatMyInitiativesList[0].selected).toBe(true);
    });

    it('deselectInits() only mutates the scoped list, leaving the flat list untouched', () => {
      component.deselectInits();

      expect(scopedMyInitiativesListIPSRByPortfolio).toEqual([{ selected: false, code: 'SP-shared' }]);
      expect(flatMyInitiativesList).toEqual([flatOnlyEntry, { selected: true, code: 'SP-shared' }]);
    });

    it('ngOnDestroy() only mutates the scoped list, leaving the flat list untouched', () => {
      scopedMyInitiativesListIPSRByPortfolio.forEach(item => (item.selected = false));

      component.ngOnDestroy();

      expect(scopedMyInitiativesListIPSRByPortfolio).toEqual([{ selected: true, code: 'SP-shared' }]);
      expect(flatMyInitiativesList).toEqual([flatOnlyEntry, { selected: true, code: 'SP-shared' }]);
    });
  });
});
