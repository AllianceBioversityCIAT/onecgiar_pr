import { TestBed } from '@angular/core/testing';

import { TypeOneReportService } from './type-one-report.service';

describe('TypeOneReportService', () => {
  let service: TypeOneReportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TypeOneReportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
