import { TestBed } from '@angular/core/testing';

import { EndpointsService } from './endpoints.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('EndpointsService', () => {
  let service: EndpointsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(EndpointsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
