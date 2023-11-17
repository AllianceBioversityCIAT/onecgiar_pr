import { TestBed } from '@angular/core/testing';

import { ChangeResultTypeServiceService } from './change-result-type-service.service';

describe('ChangeResultTypeServiceService', () => {
  let service: ChangeResultTypeServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChangeResultTypeServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
