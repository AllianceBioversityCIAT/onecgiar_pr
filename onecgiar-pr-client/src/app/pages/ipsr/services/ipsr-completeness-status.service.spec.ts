import { TestBed } from '@angular/core/testing';

import { IpsrCompletenessStatusService } from './ipsr-completeness-status.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('IpsrCompletenessStatusService', () => {
  let service: IpsrCompletenessStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(IpsrCompletenessStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
