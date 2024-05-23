import { TestBed } from '@angular/core/testing';

import { InitiativesService } from './initiatives.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InitiativesService', () => {
  let service: InitiativesService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(InitiativesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
