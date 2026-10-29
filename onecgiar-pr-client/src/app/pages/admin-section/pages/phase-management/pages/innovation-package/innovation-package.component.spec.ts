import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationPackageComponent } from './innovation-package.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InnovationPackageComponent', () => {
  let component: InnovationPackageComponent;
  let fixture: ComponentFixture<InnovationPackageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationPackageComponent],
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InnovationPackageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have appModuleId as 2', () => {
    expect(component.appModuleId).toBe(2);
  });

  it('should call onPhaseUpdate without error', () => {
    expect(() => component.onPhaseUpdate()).not.toThrow();
  });

  describe('phase operations section', () => {
    afterEach(() => {
      component.api.dataControlSE.previousIPSRPhase.phaseName = null;
      component.api.dataControlSE.IPSRCurrentPhase.phaseName = null;
    });

    it('is hidden when there is no previous phase name', () => {
      fixture.destroy();
      component.api.dataControlSE.previousIPSRPhase.phaseName = '' as any;
      fixture = TestBed.createComponent(InnovationPackageComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="phase-operations"]')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('app-other-functionalities').length).toBe(0);
    });

    it('renders 1 operation card(s) with the target phase when a previous phase exists', () => {
      fixture.destroy();
      component.api.dataControlSE.previousIPSRPhase.phaseName = 'Previous' as any;
      component.api.dataControlSE.IPSRCurrentPhase.phaseName = 'Current' as any;
      fixture = TestBed.createComponent(InnovationPackageComponent);
      fixture.detectChanges();
      const section: HTMLElement = fixture.nativeElement.querySelector('[data-testid="phase-operations"]');
      expect(section).not.toBeNull();
      expect(section.textContent).toContain('Phase operations');
      expect(section.textContent).toContain('Target phase: Current');
      expect(fixture.nativeElement.querySelectorAll('app-other-functionalities').length).toBe(1);
    });
  });
});
