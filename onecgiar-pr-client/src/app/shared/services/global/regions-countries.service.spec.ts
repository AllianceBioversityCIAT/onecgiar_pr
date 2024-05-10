import { TestBed } from '@angular/core/testing';

import { RegionsCountriesService } from './regions-countries.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('RegionsCountriesService', () => {
  let service: RegionsCountriesService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(RegionsCountriesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
