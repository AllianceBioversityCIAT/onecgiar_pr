import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService } from '../../shared/services/api/api.service';
import { TypeOneReportService } from './type-one-report.service';

describe('TypeOneReportService', () => {
  let service: TypeOneReportService;
  let sanitizer: DomSanitizer;
  let api: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      // imports
      providers: [
        { provide: DomSanitizer, useValue: { bypassSecurityTrustResourceUrl: jest.fn() } },
        { provide: ApiService, useValue: { rolesSE: { isAdmin: true }, dataControlSE: { myInitiativesList: [] } } }
      ]
    });
    service = TestBed.inject(TypeOneReportService);
    sanitizer = TestBed.inject(DomSanitizer);
    api = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should sanitize the URL', () => {
    const bypassSecurityTrustResourceUrlSpy = jest.spyOn(sanitizer, 'bypassSecurityTrustResourceUrl');
    service.initiativeSelected = 'official_code';
    service.sanitizeUrl();
    expect(bypassSecurityTrustResourceUrlSpy).toHaveBeenCalledWith(`${service.t1rBiUrl}?official_code=${service.initiativeSelected}`);
  });

  it('should get the initiative ID for non-admin users', () => {
    api.rolesSE.isAdmin = false;
    api.dataControlSE.myInitiativesList = [{ official_code: 'official_code' }];
    const initiativeID = service.getInitiativeID('official_code');
    expect(initiativeID).toEqual(api.dataControlSE.myInitiativesList[0]);
  });

  it('should get the initiative ID for admin users', () => {
    api.rolesSE.isAdmin = true;
    service.allInitiatives = [{ official_code: 'official_code' }];
    const initiativeID = service.getInitiativeID('official_code');
    expect(initiativeID).toEqual(service.allInitiatives[0]);
  });
});
