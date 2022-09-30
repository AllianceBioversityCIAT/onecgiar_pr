import { TestBed } from '@angular/core/testing';

import { GeneralInterceptorService } from './general-interceptor.service';

describe('GeneralInterceptorService', () => {
  let service: GeneralInterceptorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GeneralInterceptorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
