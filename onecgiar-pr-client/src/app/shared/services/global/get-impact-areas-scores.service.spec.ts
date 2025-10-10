import { TestBed } from '@angular/core/testing';

import { GetImpactAreasScoresService } from './get-impact-areas-scores.service';

describe('GetImpactAreasScoresService', () => {
  let service: GetImpactAreasScoresService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GetImpactAreasScoresService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
