import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { ResultsCenterReportingGuideComponent } from './results-center-reporting-guide.component';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { EntityAowService } from '../../../../../../../result-framework-reporting/pages/entity-aow/services/entity-aow.service';
import { PlatformReportingGuideService } from '../../services/platform-reporting-guide.service';
import { ReportingGuideService } from '../../../../../../../result-framework-reporting/pages/dashboard-lab/services/reporting-guide.service';

describe('ResultsCenterReportingGuideComponent', () => {
  let fixture: ComponentFixture<ResultsCenterReportingGuideComponent>;
  let component: ResultsCenterReportingGuideComponent;
  let guideServiceMock: Partial<PlatformReportingGuideService>;
  let apiMock: any;
  let reportingGuideMock: { startWhereToReportTour: jest.Mock };

  beforeEach(async () => {
    guideServiceMock = {
      refreshChoices: jest.fn(),
      reset: jest.fn(),
      modalMode: signal<'guide-only' | 'pick-program' | 'hub'>('guide-only'),
      spChoices: signal([]),
      catalogLoading: signal(false),
      selectedProgramCode: signal<string | null>(null),
      hasSpAccess: signal(false),
      hasCenterAccess: signal(false),
      selectProgram: jest.fn()
    };

    reportingGuideMock = {
      startWhereToReportTour: jest.fn()
    };

    apiMock = {
      dataControlSE: {
        reportingCurrentPhase: { phaseName: 'Reporting 2026 - P25', phaseYear: 2026, phaseId: 36 }
      },
      resultsSE: {
        GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(of({ response: { areas: [] } })),
        GET_IntermediateOutcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_2030Outcomes: jest.fn().mockReturnValue(of({ response: { tocResults: [] } })),
        GET_reportingEntryHubProjects: jest.fn().mockReturnValue(of({ response: { centers: [] } })),
        GET_ResultToReview: jest.fn().mockReturnValue(of({ response: [] }))
      },
      rolesSE: {
        getMyCenters: jest.fn().mockReturnValue([])
      }
    };

    await TestBed.configureTestingModule({
      imports: [ResultsCenterReportingGuideComponent, RouterTestingModule],
      providers: [
        { provide: PlatformReportingGuideService, useValue: guideServiceMock },
        { provide: ApiService, useValue: apiMock },
        {
          provide: EntityAowService,
          useValue: {
            entityId: signal(''),
            canReportResults: jest.fn().mockReturnValue(false),
            getAllDetailsData: jest.fn()
          }
        },
        { provide: ReportingGuideService, useValue: reportingGuideMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultsCenterReportingGuideComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('guide-only mode does not render reporting-entry-hub', () => {
    (guideServiceMock.modalMode as ReturnType<typeof signal>).set('guide-only');
    component.visible.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-reporting-entry-hub')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('W1/W2 · Pooled funding');
    expect(fixture.nativeElement.textContent).toContain('Emerging result');
    expect(fixture.nativeElement.textContent).toContain('Report emerging result');
    expect(fixture.nativeElement.querySelector('ng-icon[name="lucideZap"]')).toBeTruthy();
  });

  it('does not fetch AoW progress in guide-only mode', () => {
    component.visible.set(true);
    fixture.detectChanges();
    expect(apiMock.resultsSE.GET_ScienceProgramTocProgress).not.toHaveBeenCalled();
  });

  it('hub mode fetches hub data when program is selected', () => {
    (guideServiceMock.modalMode as ReturnType<typeof signal>).set('hub');
    (guideServiceMock.selectedProgramCode as ReturnType<typeof signal>).set('SP01');
    component.visible.set(true);
    fixture.detectChanges();

    expect(apiMock.resultsSE.GET_ScienceProgramTocProgress).toHaveBeenCalledWith('SP01', 36);
    expect(fixture.nativeElement.querySelector('app-reporting-entry-hub')).toBeTruthy();
  });

  it('starts the Where to report tour from the modal header (POT-T-5)', () => {
    component.visible.set(true);
    fixture.detectChanges();

    const tourBtn = fixture.nativeElement.querySelector('[data-guide="platform-tour-wtr-trigger"]') as HTMLButtonElement;
    expect(tourBtn).toBeTruthy();

    component.startWhereToReportTour();
    expect(reportingGuideMock.startWhereToReportTour).toHaveBeenCalledWith({
      mode: 'guide-only',
      showPicker: false,
      showEmerging: true
    });
  });
});
