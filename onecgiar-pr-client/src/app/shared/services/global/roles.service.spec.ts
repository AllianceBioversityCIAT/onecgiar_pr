import { TestBed } from '@angular/core/testing';

import { RolesService } from './roles.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(RolesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
