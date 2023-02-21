import { TestBed } from '@angular/core/testing';

import { CheckAdminGuard } from './check-admin.guard';

describe('CheckAdminGuard', () => {
  let guard: CheckAdminGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(CheckAdminGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
