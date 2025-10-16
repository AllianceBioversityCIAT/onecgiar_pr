import { TestBed } from '@angular/core/testing';

import { FieldsManagerService } from './fields-manager.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('FieldsManagerService', () => {
  let service: FieldsManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(FieldsManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
