// @akili-spec bilateral/center-overview-tab (COV-T-2, COV-DD-2, COV-R-5 B)
import { TestBed } from '@angular/core/testing';
import { BilateralContextService } from './bilateral-context.service';

describe('BilateralContextService', () => {
  let service: BilateralContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BilateralContextService);
  });

  it('starts with no shared phase selected (Open phase)', () => {
    expect(service.selectedVersionId()).toBeNull();
  });

  it('resets selectedVersionId to null when setCenter is called with a DIFFERENT acronym', () => {
    service.setCenter('AfricaRice', 'AfricaRice');
    service.selectedVersionId.set(35);

    service.setCenter('CIMMYT', 'CIMMYT');

    expect(service.selectedVersionId()).toBeNull();
  });

  it('keeps selectedVersionId when setCenter is called again with the SAME acronym', () => {
    service.setCenter('AfricaRice', 'AfricaRice');
    service.selectedVersionId.set(35);

    service.setCenter('AfricaRice', 'AfricaRice', 'AfricaRice');

    expect(service.selectedVersionId()).toBe(35);
  });

  it('resets to null the first time setCenter is called (no prior acronym)', () => {
    service.selectedVersionId.set(35);

    service.setCenter('AfricaRice', 'AfricaRice');

    expect(service.selectedVersionId()).toBeNull();
  });
});
