import { TestBed } from '@angular/core/testing';

import { CheckLoginGuard } from './check-login.guard';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('CheckLoginGuard', () => {
  let guard: CheckLoginGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    guard = TestBed.inject(CheckLoginGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
