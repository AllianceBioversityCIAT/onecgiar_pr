import { TestBed } from '@angular/core/testing';

import { ImpactAreasService } from './impact-areas.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ImpactAreasService', () => {
  let service: ImpactAreasService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ImpactAreasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
