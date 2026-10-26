import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MassivePhaseShiftComponent } from './massive-phase-shift.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

describe('MassivePhaseShiftComponent', () => {
  let component: MassivePhaseShiftComponent;
  let fixture: ComponentFixture<MassivePhaseShiftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MassivePhaseShiftComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(MassivePhaseShiftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('confirm dialog', () => {
    let patchSpy: jest.SpyInstance;

    beforeEach(() => {
      patchSpy = jest.spyOn(component.api.resultsSE, 'PATCH_versioningAnnually').mockReturnValue(of({ response: {} }) as any);
      jest.spyOn(component.api.alertsFe, 'show').mockImplementation(() => undefined as any);
      component.visible = true;
    });

    it('Cancel closes the dialog without any PATCH request', () => {
      fixture.nativeElement.querySelector('[data-testid="mps-cancel"]').click();
      expect(component.visible).toBe(false);
      expect(patchSpy).not.toHaveBeenCalled();
    });

    it('Confirm fires the PATCH once', () => {
      fixture.nativeElement.querySelector('[data-testid="mps-confirm"]').click();
      expect(patchSpy).toHaveBeenCalledTimes(1);
    });

    it('shows from and to phase names', () => {
      fixture.destroy();
      component.api.dataControlSE.previousReportingPhase.phaseName = 'Reporting 2024' as any;
      component.api.dataControlSE.reportingCurrentPhase.phaseName = 'Reporting 2025' as any;
      fixture = TestBed.createComponent(MassivePhaseShiftComponent);
      fixture.detectChanges();
      const from = fixture.nativeElement.querySelector('[data-testid="mps-from"]').textContent;
      const to = fixture.nativeElement.querySelector('[data-testid="mps-to"]').textContent;
      expect(from).toContain('Reporting 2024');
      expect(to).toContain('Reporting 2025');
      component.api.dataControlSE.previousReportingPhase.phaseName = null;
      component.api.dataControlSE.reportingCurrentPhase.phaseName = null;
    });
  });
});
