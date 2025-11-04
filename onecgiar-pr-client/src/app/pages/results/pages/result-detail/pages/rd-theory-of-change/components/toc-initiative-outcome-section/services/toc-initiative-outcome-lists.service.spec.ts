import { TestBed } from '@angular/core/testing';
import { TocInitiativeOutcomeListsService } from './toc-initiative-outcome-lists.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ApiService } from '../../../../../../../../../shared/services/api/api.service';
import { FieldsManagerService } from '../../../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../../../shared/services/data-control.service';

describe('TocInitiativeOutcomeListsService', () => {
  let service: TocInitiativeOutcomeListsService;
  let mockApiService: any;
  let mockFieldsManagerService: any;
  let mockDataControlService: any;
  const mockResponse = [
    { toc_level_id: 1, name: 'Level 1' },
    { toc_level_id: 2, name: 'Level 2' },
    { toc_level_id: 3, name: 'Level 3' },
    { toc_level_id: 4, name: 'Level 4' }
  ];

  beforeEach(() => {
    mockApiService = {
      tocApiSE: {
        GET_AllTocLevels: jest.fn().mockReturnValue(of({ response: mockResponse }))
      }
    };

    mockFieldsManagerService = {
      isP25: jest.fn().mockReturnValue(false)
    };

    mockDataControlService = {
      currentResultSignal: signal({ portfolio: 'some-portfolio' })
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TocInitiativeOutcomeListsService,
        { provide: ApiService, useValue: mockApiService },
        { provide: FieldsManagerService, useValue: mockFieldsManagerService },
        { provide: DataControlService, useValue: mockDataControlService }
      ]
    });
    service = TestBed.inject(TocInitiativeOutcomeListsService);
  });

  it('should populate outcomeLevelList with levels 2 and 3', done => {
    // The effect runs automatically when the service is created
    // Wait a bit for the effect to complete
    setTimeout(() => {
      expect(mockApiService.tocApiSE.GET_AllTocLevels).toHaveBeenCalledWith(false);
      expect(service.outcomeLevelList.length).toBe(2);
      expect(service.outcomeLevelList[0].toc_level_id).toBe(2);
      expect(service.outcomeLevelList[1].toc_level_id).toBe(3);
      done();
    }, 100);
  });

  it('should handle GET_AllTocLevels error', done => {
    const spyConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const errorMessage = 'Error message';

    // Create a new service instance with error response
    const errorApiService = {
      tocApiSE: {
        GET_AllTocLevels: jest.fn().mockReturnValue(throwError(() => errorMessage))
      }
    };

    const errorFieldsManagerService = {
      isP25: jest.fn().mockReturnValue(false)
    };

    const errorDataControlService = {
      currentResultSignal: signal({ portfolio: 'some-portfolio' })
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TocInitiativeOutcomeListsService,
        { provide: ApiService, useValue: errorApiService },
        { provide: FieldsManagerService, useValue: errorFieldsManagerService },
        { provide: DataControlService, useValue: errorDataControlService }
      ]
    });

    const errorService = TestBed.inject(TocInitiativeOutcomeListsService);

    setTimeout(() => {
      expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
      done();
    }, 100);
  });
});
