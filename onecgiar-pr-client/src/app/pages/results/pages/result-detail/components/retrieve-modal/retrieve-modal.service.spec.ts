import { TestBed } from '@angular/core/testing';

import { RetrieveModalService } from './retrieve-modal.service';
import { RetrieveRequestBody } from './models/RetrieveRequestBody.model';

describe('RetrieveModalService', () => {
  let service: RetrieveModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RetrieveModalService);
  });

  it('should have an empty title initially', () => {
    expect(service.title).toEqual('');
  });

  it('should have an empty requester_initiative_id initially', () => {
    expect(service.requester_initiative_id).toEqual('');
  });

  it('should have a RetrieveRequestBody instance initially', () => {
    expect(service.retrieveRequestBody instanceof RetrieveRequestBody).toBeTruthy();
  });
});
