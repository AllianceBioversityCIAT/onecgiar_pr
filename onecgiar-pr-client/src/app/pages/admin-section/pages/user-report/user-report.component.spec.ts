import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserReportComponent } from './user-report.component';
import { HttpClientModule } from '@angular/common/http';
import { FilterByTextModule } from '../../../../shared/pipes/filter-by-text.module';
import { CustomFieldsModule } from '../../../../custom-fields/custom-fields.module';
import { of } from 'rxjs';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

describe('UserReportComponent', () => {
  let component: UserReportComponent;
  let fixture: ComponentFixture<UserReportComponent>;
  let apiService: ApiService;
  let exportTablesService: ExportTablesService;

  beforeEach(async () => {
    apiService = {
      resultsSE: {
        GET_reportUsers: jest.fn().mockReturnValue(of({ response: [] }))
      }
    } as any;

    exportTablesService = {
      exportExcel: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      declarations: [UserReportComponent],
      imports: [HttpClientModule, FilterByTextModule, CustomFieldsModule],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: ExportTablesService, useValue: exportTablesService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserReportComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call GET_reportUsers on init', () => {
    const spy = jest.spyOn(component, 'GET_reportUsers');
    component.ngOnInit();
    expect(spy).toHaveBeenCalled();
  });

  it('should set usersList when GET_reportUsers is called', () => {
    const mockResponse = [{ user_id: 1 }];
    jest.spyOn(apiService.resultsSE, 'GET_reportUsers').mockReturnValue(of({ response: mockResponse }));
    component.GET_reportUsers();
    expect(component.usersList).toEqual(mockResponse);
  });

  it('should call exportExcel with mapped usersList', () => {
    const mockUsersList = [
      {
        user_id: '1',
        init_name_official_code: 'code',
        user_email: 'email',
        user_first_name: 'first',
        user_last_name: 'last',
        app_role_name: 'appRole',
        initiative_role_name: 'initRole'
      }
    ];
    component.exportExcel(mockUsersList);
    expect(exportTablesService.exportExcel).toHaveBeenCalledWith(
      [
        {
          user_id: '1',
          init_name_official_code: 'code',
          user_email: 'email',
          user_first_name: 'first',
          user_last_name: 'last',
          app_role_name: 'appRole',
          initiative_role_name: 'initRole'
        }
      ],
      'user_report',
      [
        { header: 'User id', key: 'user_id', width: 16 },
        { header: 'Initiative name', key: 'init_name_official_code', width: 70 },
        { header: 'Email', key: 'user_email', width: 38 },
        { header: 'First name', key: 'user_first_name', width: 16 },
        { header: 'Last name', key: 'user_last_name', width: 16 },
        { header: 'Initiative role', key: 'initiative_role_name', width: 16 },
        { header: 'Application role', key: 'app_role_name', width: 18 }
      ]
    );
  });

  it('should convert null or "null" to "Not applicable"', () => {
    expect(component.convertToNodata(null)).toBe('Not applicable');
    expect(component.convertToNodata('null')).toBe('Not applicable');
    expect(component.convertToNodata('value')).toBe('value');
  });
});
