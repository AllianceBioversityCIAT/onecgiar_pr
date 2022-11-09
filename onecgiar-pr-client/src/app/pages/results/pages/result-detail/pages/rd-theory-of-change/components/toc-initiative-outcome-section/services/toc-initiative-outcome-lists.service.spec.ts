import { TestBed } from '@angular/core/testing';

import { TocInitiativeOutcomeListsService } from './toc-initiative-outcome-lists.service';

describe('TocInitiativeOutcomeListsService', () => {
  let service: TocInitiativeOutcomeListsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TocInitiativeOutcomeListsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
