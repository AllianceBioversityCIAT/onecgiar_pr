import { TestBed } from '@angular/core/testing';

import { ResultHistoryOfChangesModalService } from './result-history-of-changes-modal.service';

describe('ResultHistoryOfChangesModalService', () => {
  let service: ResultHistoryOfChangesModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultHistoryOfChangesModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
