import { TestBed } from '@angular/core/testing';

import { ImpactAreasService } from './impact-areas.service';

describe('ImpactAreasService', () => {
  let service: ImpactAreasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImpactAreasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
