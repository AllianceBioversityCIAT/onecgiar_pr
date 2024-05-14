import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ResultsApiService } from './results-api.service';
import { DataControlService } from '../data-control.service';
import { RolesService } from '../global/roles.service';
import { Title } from '@angular/platform-browser';

describe('ApiService', () => {
  let service: ApiService;
  let authServiceSpy;
  let resultsApiServiceSpy;
  let dataControlServiceSpy;
  let rolesServiceSpy;
  let titleServiceSpy;

  beforeEach(() => {
    authServiceSpy = {
      GET_allRolesByUser: jest.fn().mockReturnValue(of({ response: [] })),
      GET_initiativesByUser: jest.fn().mockReturnValue(of({ response: [] }))
    };

    resultsApiServiceSpy = {
      GETInnovationPackageDetail: jest.fn().mockReturnValue(of({ response: {} }))
    };

    dataControlServiceSpy = {};
    rolesServiceSpy = { validateReadOnly: jest.fn() };
    titleServiceSpy = { setTitle: jest.fn() };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiService,
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ResultsApiService, useValue: resultsApiServiceSpy },
        { provide: DataControlService, useValue: dataControlServiceSpy },
        { provide: RolesService, useValue: rolesServiceSpy },
        { provide: Title, useValue: titleServiceSpy }
      ]
    });

    service = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call updateUserData', async () => {
    service.updateUserData(() => {
      expect(authServiceSpy.GET_allRolesByUser).toHaveBeenCalled();
      expect(authServiceSpy.GET_initiativesByUser).toHaveBeenCalled();
    });
  });

  it('should call GETInnovationPackageDetail', () => {
    service.GETInnovationPackageDetail();
    expect(resultsApiServiceSpy.GETInnovationPackageDetail).toHaveBeenCalled();
  });

  it('should call clearAll', () => {
    service.clearAll();
    expect(service.dataControlSE.myInitiativesList.length).toBe(0);
  });

  it('should call setTitle', () => {
    service.setTitle('Test Title');
    expect(titleServiceSpy.setTitle).toHaveBeenCalledWith('Test Title');
  });

  // Agrega más pruebas para otros métodos
});
