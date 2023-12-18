import { TestBed } from '@angular/core/testing';

import { ChangeResultTypeServiceService } from './change-result-type-service.service';

describe('ChangeResultTypeServiceService', () => {
  let service: ChangeResultTypeServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChangeResultTypeServiceService);
  });

  it('should have initial values', () => {
    expect(service.justification).toEqual('');
    expect(service.otherJustification).toEqual('');
    expect(service.showConfirmation).toBeFalsy();
    expect(service.showFilters).toBeTruthy();
    expect(service.step).toEqual(0);
  });

  it('should update properties', () => {
    service.justification = 'Test Justification';
    service.otherJustification = 'Test Other Justification';
    service.showConfirmation = true;
    service.showFilters = false;
    service.step = 1;

    expect(service.justification).toEqual('Test Justification');
    expect(service.otherJustification).toEqual('Test Other Justification');
    expect(service.showConfirmation).toBeTruthy();
    expect(service.showFilters).toBeFalsy();
    expect(service.step).toEqual(1);
  });
});
