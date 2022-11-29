import { TestBed } from '@angular/core/testing';

import { SaveButtonService } from './save-button.service';

describe('SaveButtonService', () => {
  let service: SaveButtonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaveButtonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
