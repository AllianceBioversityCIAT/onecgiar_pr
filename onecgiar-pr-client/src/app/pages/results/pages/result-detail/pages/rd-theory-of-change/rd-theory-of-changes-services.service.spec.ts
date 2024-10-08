import { TestBed } from '@angular/core/testing';
import { RdTheoryOfChangesServicesService } from './rd-theory-of-changes-services.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

describe('RdTheoryOfChangesServicesService', () => {
  let service: RdTheoryOfChangesServicesService;
  let mockApiService: any;

  beforeEach(() => {
    mockApiService = {
      resultsSE: {
        get_vesrsionDashboard: () => of({ response: { version_id: 1 } })
      }
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = new RdTheoryOfChangesServicesService(mockApiService);
  });

  describe('get_versionDashboard()', () => {
    it('should set fullInitiativeToc when get_vesrsionDashboard call is successful', () => {
      const spy = jest.spyOn(mockApiService.resultsSE, 'get_vesrsionDashboard');

      service.get_versionDashboard(1);

      expect(spy).toHaveBeenCalled();
      expect(service.fullInitiativeToc).toEqual(1);
    });

    it('should log an error when get_versionDashboard call fails', () => {
      const mockError = 'error';
      jest.spyOn(mockApiService.resultsSE, 'get_vesrsionDashboard').mockReturnValue(throwError(mockError));
      const spy = jest.spyOn(console, 'error');

      service.get_versionDashboard(1);

      expect(spy).toHaveBeenCalledWith(mockError);
    });
  });
});
