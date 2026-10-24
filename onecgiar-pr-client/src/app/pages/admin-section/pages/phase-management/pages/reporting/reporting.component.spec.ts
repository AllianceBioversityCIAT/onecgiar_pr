import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportingComponent } from './reporting.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ModuleTypeEnum } from '../../../../../../shared/enum/api.enum';

describe('ReportingComponent', () => {
  let component: ReportingComponent;
  let fixture: ComponentFixture<ReportingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportingComponent],
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have moduleType as ModuleTypeEnum.REPORTING', () => {
    expect(component.moduleType).toBe(ModuleTypeEnum.REPORTING);
  });

  it('should have appModuleId as 1', () => {
    expect(component.appModuleId).toBe(1);
  });

  it('should call onPhaseUpdate without error', () => {
    expect(() => component.onPhaseUpdate()).not.toThrow();
  });

  describe('phase operations section', () => {
    afterEach(() => {
      component.api.dataControlSE.previousReportingPhase.phaseName = null;
      component.api.dataControlSE.reportingCurrentPhase.phaseName = null;
    });

    it('is hidden when there is no previous phase name', () => {
      fixture.destroy();
      component.api.dataControlSE.previousReportingPhase.phaseName = '' as any;
      fixture = TestBed.createComponent(ReportingComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="phase-operations"]')).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('app-other-functionalities').length).toBe(0);
    });

    it('renders 2 operation card(s) with the target phase when a previous phase exists', () => {
      fixture.destroy();
      component.api.dataControlSE.previousReportingPhase.phaseName = 'Previous' as any;
      component.api.dataControlSE.reportingCurrentPhase.phaseName = 'Current' as any;
      fixture = TestBed.createComponent(ReportingComponent);
      fixture.detectChanges();
      const section: HTMLElement = fixture.nativeElement.querySelector('[data-testid="phase-operations"]');
      expect(section).not.toBeNull();
      expect(section.textContent).toContain('Phase operations');
      expect(section.textContent).toContain('Target phase: Current');
      expect(fixture.nativeElement.querySelectorAll('app-other-functionalities').length).toBe(2);
    });
  });
});
