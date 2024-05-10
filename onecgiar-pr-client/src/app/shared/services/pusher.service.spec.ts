import { TestBed } from '@angular/core/testing';

import { PusherService } from './pusher.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('PusherService', () => {
  let service: PusherService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PusherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
