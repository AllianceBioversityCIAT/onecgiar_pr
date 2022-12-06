import { TestBed } from '@angular/core/testing';

import { ExportTablesService } from './export-tables.service';

describe('ExportTablesService', () => {
  let service: ExportTablesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExportTablesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
