import { TestBed } from '@angular/core/testing';

import { InitiativesService } from './initiatives.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../api/api.service';
import { of } from 'rxjs';

describe('InitiativesService', () => {
  let service: InitiativesService;
  const mockApiService = {
    resultsSE: {
      GET_AllInitiativesEntities: jest.fn().mockReturnValue(
        of({
          response: [
            {
              name: 'P25',
              entities: [
                { initiative_id: 10, official_code: 'SP01' },
                { initiative_id: 41, official_code: 'SGP-02' }
              ]
            }
          ]
        })
      )
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: ApiService, useValue: mockApiService }]
    });
    service = TestBed.inject(InitiativesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should exclude AVISA from entity groups on load', () => {
    expect(service.allInitiatives()).toEqual([
      {
        name: 'P25',
        entities: [{ initiative_id: 10, official_code: 'SP01' }]
      }
    ]);
  });
});
