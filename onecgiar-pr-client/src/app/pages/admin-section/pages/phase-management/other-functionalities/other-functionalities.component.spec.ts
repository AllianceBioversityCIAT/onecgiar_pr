import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OtherFunctionalitiesComponent } from './other-functionalities.component';
import { PrButtonComponent } from '../../../../../custom-fields/pr-button/pr-button.component';
import { MassivePhaseShiftComponent } from './components/massive-phase-shift/massive-phase-shift.component';
import { ApiService } from '../../../../../shared/services/api/api.service';

describe('OtherFunctionalitiesComponent', () => {
  let component: OtherFunctionalitiesComponent;
  let fixture: ComponentFixture<OtherFunctionalitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OtherFunctionalitiesComponent, PrButtonComponent, MassivePhaseShiftComponent],
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    }).compileComponents();

    fixture = TestBed.createComponent(OtherFunctionalitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('execute', () => {
    it('should set the massive phase shift modal to visible', () => {
      component.execute();
      expect(component.massivePhaseShiftModal.visible).toBe(true);
    });
  });
  describe('replicateBannerText', () => {
    it('should return the correct string when replicateIPSR is true', () => {
      component.replicateIPSR = true;
      const result = component.replicateBannerText();
      expect(result).toBe('Replicate all Innovation Packages from previous phase to the current active phase');
    });

    it('should return the correct string when replicateIPSR is false', () => {
      component.replicateIPSR = false;
      const result = component.replicateBannerText();
      expect(result).toBe('Replicate all result innovations from previous phase to the current active phase (except Editing/Rejected)');
    });

    it('should return the correct string when replicateInnovationUse is true', () => {
      component.replicateInnovationUse = true;
      const result = component.replicateBannerText();
      expect(result).toBe('Replicate all Innovation Use results from previous phase to the current active phase');
    });
  });

  describe('replicateTitle', () => {
    it('returns a distinct card title per input', () => {
      component.replicateIPSR = false;
      component.replicateInnovationUse = false;
      const results = component.replicateTitle();
      component.replicateInnovationUse = true;
      const use = component.replicateTitle();
      component.replicateInnovationUse = false;
      component.replicateIPSR = true;
      const ipsr = component.replicateTitle();
      expect(results).toBe('Result innovations');
      expect(use).toBe('Innovation use');
      expect(ipsr).toBe('Innovation packages');
      expect(new Set([results, use, ipsr]).size).toBe(3);
    });
  });

  describe('card template', () => {
    it('renders the description, the title and keeps Execute enabled when idle', () => {
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('[data-testid="of-title"]')?.textContent).toContain('Result innovations');
      expect(el.querySelector('[data-testid="of-description"]')?.textContent).toContain('Replicate all result innovations');
      expect(el.querySelector('app-pr-button')?.classList.contains('globalDisabled')).toBe(false);
    });

    it('disables Execute while a replication is running', () => {
      fixture.destroy();
      component.api.dataControlSE.massivePhaseShiftIsRunning = true;
      fixture = TestBed.createComponent(OtherFunctionalitiesComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-pr-button').classList.contains('globalDisabled')).toBe(true);
      component.api.dataControlSE.massivePhaseShiftIsRunning = false;
    });
  });
});
