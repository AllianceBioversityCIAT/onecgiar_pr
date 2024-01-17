import { TestBed } from '@angular/core/testing';
import { TocInitiativeOutcomeListsService } from './toc-initiative-outcome-lists.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

describe('TocInitiativeOutcomeListsService', () => {
  let service: TocInitiativeOutcomeListsService;
  let mockApiService: any;
  const mockResponse = [
    { toc_level_id: 1, name: 'Level 1' },
    { toc_level_id: 2, name: 'Level 2' },
    { toc_level_id: 3, name: 'Level 3' },
    { toc_level_id: 4, name: 'Level 4' },
  ];


  beforeEach(() => {
    mockApiService = {
      tocApiSE: {
        GET_AllTocLevels: () => of({ response: mockResponse }),
      },
    }

    TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule
      ],
    });
    service = new TocInitiativeOutcomeListsService(mockApiService);
  });

  it('should populate outcomeLevelList with levels 2 and 3',() => {
    const spy = jest.spyOn(mockApiService.tocApiSE, 'GET_AllTocLevels');

    service = new TocInitiativeOutcomeListsService(mockApiService);

    expect(spy).toHaveBeenCalled();
    expect(service.outcomeLevelList.length).toBe(2);
    expect(service.outcomeLevelList[0].toc_level_id).toBe(2);
    expect(service.outcomeLevelList[1].toc_level_id).toBe(3);
  });

  it('should handle GET_AllTocLevels error', () => {
    const spyConsoleError = jest.spyOn(console, 'error');

    const errorMessage = 'Error message';
       mockApiService = {
        tocApiSE: {
          GET_AllTocLevels: () => throwError(errorMessage),
        },
      }
    service = new TocInitiativeOutcomeListsService(mockApiService)

    expect(spyConsoleError).toHaveBeenCalledWith(errorMessage);
  });

});
