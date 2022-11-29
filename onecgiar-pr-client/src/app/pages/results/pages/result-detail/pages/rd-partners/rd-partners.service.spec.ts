import { TestBed } from '@angular/core/testing';

import { RdPartnersService } from './rd-partners.service';

describe('RdPartnersService', () => {
  let service: RdPartnersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RdPartnersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
