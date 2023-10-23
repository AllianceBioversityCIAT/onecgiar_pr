import { TestBed } from '@angular/core/testing';

import { MultipleWPsServiceService } from './multiple-wps-service.service';

describe('MultipleWPsServiceService', () => {
  let service: MultipleWPsServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MultipleWPsServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
