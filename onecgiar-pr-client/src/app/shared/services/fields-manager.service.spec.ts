import { TestBed } from '@angular/core/testing';

import { FieldsManagerService } from './fields-manager.service';

describe('FieldsManagerService', () => {
  let service: FieldsManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FieldsManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
