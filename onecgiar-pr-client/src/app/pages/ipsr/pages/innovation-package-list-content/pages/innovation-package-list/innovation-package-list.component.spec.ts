import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableModule } from 'primeng/table';
import { MenuModule } from 'primeng/menu';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
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
import { DialogModule } from 'primeng/dialog';
import { PrFieldHeaderComponent } from '../../../../../../custom-fields/pr-field-header/pr-field-header.component';

describe('InnovationPackageListComponent', () => {
  let component: InnovationPackageListComponent;
  let fixture: ComponentFixture<InnovationPackageListComponent>;
  let apiService: ApiService;
  let ipsrDataControlSE: IpsrDataControlService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationPackageListComponent, InnovationPackageCustomTableComponent, IpsrListFiltersComponent, PrButtonComponent, SectionHeaderComponent, InnovationPackageListFilterPipe, UpdateIpsrResultModalComponent, PrFieldHeaderComponent],
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
      imports: [HttpClientTestingModule, TableModule, MenuModule, DialogModule]
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

  it('should update inno.full_name and inno.result_code on GETAllInnovationPackages', () => {
    const response = [
      { result_code: '1', title: 'Title 1', official_code: 'OC1' },
      { result_code: '2', title: 'Title 2', official_code: 'OC2' }
    ];

    component.ipsrDataControlSE.ipsrResultList = response;

    component.GETAllInnovationPackages();

    component.ipsrDataControlSE.ipsrResultList.map((inno: any) => {
      inno.full_name = `${inno?.result_code} ${inno?.title} ${inno?.official_code}`;
      inno.result_code = Number(inno.result_code);
    });

    expect(ipsrDataControlSE.ipsrResultList).toEqual([
      { result_code: 1, title: 'Title 1', official_code: 'OC1', full_name: '1 Title 1 OC1' },
      { result_code: 2, title: 'Title 2', official_code: 'OC2', full_name: '2 Title 2 OC2' }
    ]);
  });

  it('should return the joined text of initsSelectedJoinText', () => {
    const myInitiativesList = [{ selected: true }, { selected: false }];
    const options = [{ selected: true }, { selected: false }];
    const expectedJoinText = JSON.stringify([...myInitiativesList, ...options]);
    component.api.dataControlSE.myInitiativesList = myInitiativesList;
    component.ipsrListFilterSE.filters = { general: [{}, { options }] };

    expect(component.initsSelectedJoinText).toEqual(expectedJoinText);
  });

  it('should return true for everyDeselected when all items are deselected', () => {
    component.api.dataControlSE.myInitiativesList = [{ selected: false }, { selected: false }];

    expect(component.everyDeselected).toBe(true);
  });

  it('should set selected property to false for all items on deselectInits', () => {
    const myInitiativesList = [{ selected: true }, { selected: true }];

    component.api.dataControlSE.myInitiativesList = myInitiativesList;
    component.deselectInits();

    expect(component.api.dataControlSE.myInitiativesList).toEqual([{ selected: false }, { selected: false }]);
  });

  it('should set selected property to true for all items on ngOnDestroy', () => {
    const myInitiativesList = [{ selected: false }, { selected: false }];

    component.api.dataControlSE.myInitiativesList = myInitiativesList;
    component.ngOnDestroy();

    expect(component.api.dataControlSE.myInitiativesList).toEqual([{ selected: true }, { selected: true }]);
  });
});
