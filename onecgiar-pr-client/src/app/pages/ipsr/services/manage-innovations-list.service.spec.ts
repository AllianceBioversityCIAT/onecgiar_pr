import { TestBed } from '@angular/core/testing';

import { ManageInnovationsListService } from './manage-innovations-list.service';
import { of } from 'rxjs';
import { ApiService } from '../../../shared/services/api/api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ManageInnovationsListService', () => {
  let service: ManageInnovationsListService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ManageInnovationsListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });


  it('GETallInnovations builds full_name with the P/A label so the picker search matches the name (PF2 S1)', () => {
    const api = TestBed.inject(ApiService);
    jest.spyOn(api.resultsSE, 'GETallInnovations').mockReturnValue(of({ response: [{ result_code: '1', title: 'T', official_code: 'SP05', initiative_name: 'Better Diets' }] } as any));
    service.GETallInnovations(1);
    expect(service.allInnovationsList[0]['full_name']).toContain('SP05 - Better Diets');
  });
});
