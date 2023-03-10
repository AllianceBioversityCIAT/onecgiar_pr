import { TestBed } from '@angular/core/testing';

import { IpsrDataControlService } from './ipsr-data-control.service';

describe('IpsrDataControlService', () => {
  let service: IpsrDataControlService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IpsrDataControlService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
