import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionZeroDashboardComponent } from './section-zero-dashboard.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { signal } from '@angular/core';

describe('SectionZeroDashboardComponent', () => {
  let component: SectionZeroDashboardComponent;
  let fixture: ComponentFixture<SectionZeroDashboardComponent>;
  let creationService: jest.Mocked<Partial<BilateralCreationService>>;
  let mdsTracker: Partial<BilateralMdsTrackerService>;

  beforeEach(async () => {
    creationService = {
      selectedProject: signal(null) as any,
      selectedPrimarySp: signal(null) as any,
      selectedSecondarySps: signal([]) as any,
      isAiGenerated: signal(false) as any,
      isLoadingResult: signal(false) as any,
      currentResultId: signal(null) as any,
      resultCode: signal(null) as any,
      isW3Bilateral: signal(false) as any,
      resultTypeName: signal(null) as any,
      reportingYear: signal(null) as any,
    };

    mdsTracker = {
      overallStatus: signal('empty'),
    } as any;

    await TestBed.configureTestingModule({
      imports: [SectionZeroDashboardComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creationService },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionZeroDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit submitRequested on submit', () => {
    const emitSpy = jest.spyOn(component.submitRequested, 'emit');
    component.onSubmit();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should show empty project hint when no project selected', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Select a project');
  });

  it('should label unavailable actions and keep submit status visible', () => {
    const el = fixture.nativeElement as HTMLElement;
    const statuses = Array.from(el.querySelectorAll('.bp-action-status'))
      .map(status => status.textContent?.trim());

    expect(statuses).toEqual(['Coming soon', 'Coming soon', 'Coming soon', 'In progress']);
  });

  it('should show the AI Result badge when the result was generated with AI', () => {
    (creationService.isAiGenerated as any).set(true);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('AI Result');
  });

  it('should show the result code, type, reporting year, and W3/Bilateral fields as labeled metadata', () => {
    (creationService.resultCode as any).set('BEANS4WOMEN-001');
    (creationService.resultTypeName as any).set('Knowledge product');
    (creationService.reportingYear as any).set(2025);
    (creationService.isW3Bilateral as any).set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const labels = Array.from(el.querySelectorAll('.bp-meta-field-label')).map(l => l.textContent?.trim());
    expect(labels).toEqual(['Result code', 'Result type', 'Reporting phase', 'Funding source']);
    expect(el.querySelector('.bp-meta-field-value--code')?.textContent).toContain('BEANS4WOMEN-001');
    expect(el.querySelectorAll('.bp-meta-field-value')[1]?.textContent).toContain('Knowledge product');
    expect(el.querySelectorAll('.bp-meta-field-value')[2]?.textContent).toContain('2025');
    expect(el.querySelector('.bp-meta-field-value--w3')?.textContent).toContain('W3 / Bilateral');
  });

  it('should not show the result meta row when none of its fields are set', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.bp-result-meta')).toBeNull();
  });
});
