import { TestBed } from '@angular/core/testing';

import { InnovationDevInfoUtilsService } from './innovation-dev-info-utils.service';

describe('InnovationDevInfoUtilsService', () => {
  let service: InnovationDevInfoUtilsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(InnovationDevInfoUtilsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
