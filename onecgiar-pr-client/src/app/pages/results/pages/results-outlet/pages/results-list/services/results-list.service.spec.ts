import { TestBed } from '@angular/core/testing';

import { ResultsListService } from './results-list.service';

describe('ResultsListService', () => {
  let service: ResultsListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResultsListService);
  });

  it('should have initial properties set', () => {
    expect(service.showDeletingResultSpinner).toBeFalsy();
    expect(service.showLoadingResultSpinner).toBeFalsy();
  });

  it('should update showDeletingResultSpinner property', () => {
    const value = true;
    service.showDeletingResultSpinner = value;
    expect(service.showDeletingResultSpinner).toBeTruthy();
  });

  it('should update showLoadingResultSpinner property', () => {
    const value = true;
    service.showLoadingResultSpinner = value;
    expect(service.showLoadingResultSpinner).toBeTruthy();
  });
});
