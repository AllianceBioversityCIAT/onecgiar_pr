import { TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComplementaryInnovationService } from './complementary-innovation.service';
import { CreateComplementaryInnovationDto } from '../components/new-complementary-innovation/new-complementary-innovation.component';

describe('ComplementaryInnovationService', () => {
  let service: ComplementaryInnovationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ComplementaryInnovationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should reset all values', () => {
    service.resetAll();
    expect(service.bodyNewComplementaryInnovation).toEqual(new CreateComplementaryInnovationDto());
    expect(service.complementaries).toBe(true);
    expect(service.idInnovation).toBeNull();
    expect(service.dialogStatus).toBe(false);
    expect(service.isEdit).toBe(false);
  });
});
