import { TestBed } from '@angular/core/testing';

import { GeneralInterceptorService } from './general-interceptor.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('GeneralInterceptorService', () => {
  let service: GeneralInterceptorService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GeneralInterceptorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
