import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CheckAdminGuard } from './check-admin.guard';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CheckAdminGuard', () => {
  let guard: CheckAdminGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule]
    });
    guard = TestBed.inject(CheckAdminGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
