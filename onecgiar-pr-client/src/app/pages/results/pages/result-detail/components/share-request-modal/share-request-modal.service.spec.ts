import { TestBed } from '@angular/core/testing';

import { ShareRequestModalService } from './share-request-modal.service';
import { ShareRequestBody } from './model/shareRequestBody.model';

describe('ShareRequestModalService', () => {
  let service: ShareRequestModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareRequestModalService);
  });

  it('should initialize inNotifications as false', () => {
    expect(service.inNotifications).toBeFalsy();
  });

  it('should initialize shareRequestBody as an instance of ShareRequestBody', () => {
    expect(service.shareRequestBody).toBeInstanceOf(ShareRequestBody);
  });
});
