import { TestBed } from '@angular/core/testing';

import { RegionsCountriesService } from './regions-countries.service';

describe('RegionsCountriesService', () => {
  let service: RegionsCountriesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegionsCountriesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
