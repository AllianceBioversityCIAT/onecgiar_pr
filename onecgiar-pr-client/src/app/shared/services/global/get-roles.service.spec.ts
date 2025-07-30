import { TestBed } from '@angular/core/testing';

import { GetRolesService } from './get-roles.service';

describe('GetRolesService', () => {
  let service: GetRolesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GetRolesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
