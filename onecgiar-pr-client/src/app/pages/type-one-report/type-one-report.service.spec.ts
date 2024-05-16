import { TestBed } from '@angular/core/testing';
import { TypeOneReportService } from './type-one-report.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../shared/services/api/api.service';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';

describe('TypeOneReportService', () => {
  let service: TypeOneReportService;
  let mockDomSanitizer: any;
  let mockApiService: any;
  const mockInitiatives = [
    {
      official_code: 1
    }
  ];

  beforeEach(() => {
    mockApiService = {
      rolesSE: {
        isAdmin: true
      },
      resultsSE: {
        GET_platformGlobalVariablesByCategoryId: () => of({ response: mockInitiatives })
      },
      dataControlSE: {
        myInitiativesList: [{ official_code: 1 }, { official_code: 2 }]
      }
    };

    mockDomSanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn()
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: DomSanitizer, useValue: mockDomSanitizer }
      ]
    });
    service = TestBed.inject(TypeOneReportService);
  });

  describe('getInitiativeID', () => {
    it('should return the correct initiative for admin user', () => {
      service.allInitiatives = [
        {
          official_code: 1
        }
      ];
      const result = service.getInitiativeID(1);

      expect(result).toEqual({ official_code: 1 });
    });
    it('should return the correct initiative for non-admin user', () => {
      mockApiService.rolesSE.isAdmin = false;

      const result = service.getInitiativeID(2);

      expect(result).toEqual({ official_code: 2 });
    });
  });
});
