import { TestBed } from '@angular/core/testing';

import { GetImpactAreasScoresService } from './get-impact-areas-scores.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('GetImpactAreasScoresService', () => {
  let service: GetImpactAreasScoresService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(GetImpactAreasScoresService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
