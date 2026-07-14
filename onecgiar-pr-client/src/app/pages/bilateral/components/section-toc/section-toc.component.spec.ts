import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionTocComponent } from './section-toc.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { TocApiService } from '../../../../shared/services/api/toc-api.service';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('SectionTocComponent', () => {
  let component: SectionTocComponent;
  let fixture: ComponentFixture<SectionTocComponent>;
  let creationService: any;
  let mdsTracker: any;
  let tocApi: any;

  beforeEach(async () => {
    creationService = {
      currentResultId: signal(123),
      selectedPrimarySp: signal({ programId: 456, programCode: 'SP01', allocation: '40' }),
    };

    mdsTracker = {
      updateSection: jest.fn(),
    };

    tocApi = {
      GET_tocLevelsByconfig: jest.fn().mockReturnValue(of({ response: [] })),
    };

    await TestBed.configureTestingModule({
      imports: [SectionTocComponent],
      providers: [
        { provide: BilateralCreationService, useValue: creationService },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: TocApiService, useValue: tocApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SectionTocComponent);
    component = fixture.componentInstance;
    component.resultTypeId = 1;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update MDS tracker on init', () => {
    expect(mdsTracker.updateSection).toHaveBeenCalledWith('contributors', 1);
  });

  it('should toggle planned state', () => {
    component.onPlannedChange(false);
    expect(component.isPlanned()).toBe(false);
  });

  it('should change level and reset selection', () => {
    component.selectedTocId.set(42);
    component.onLevelChange(1);
    expect(component.selectedLevel()).toBe(1);
    expect(component.selectedTocId()).toBeNull();
  });

  it('should toggle ToC result selection', () => {
    component.onTocResultSelect(42);
    expect(component.selectedTocId()).toBe(42);
    component.onTocResultSelect(42);
    expect(component.selectedTocId()).toBeNull();
  });

  it('should return match info for policy indicator with result type 1', () => {
    component.resultTypeId = 1;
    const info = component.getIndicatorMatchInfo({ type_value: '%Number of Policy%', type_name: 'Policy' });
    expect(info.cssClass).toBe('bp-toc-match--match');
  });

  it('should return other-type info for mismatched indicator', () => {
    component.resultTypeId = 1;
    const info = component.getIndicatorMatchInfo({ type_value: '%Number of innovations%', type_name: 'Innovations' });
    expect(info.cssClass).toBe('bp-toc-match--other');
  });

  it('should return neutral for null type', () => {
    const info = component.getIndicatorMatchInfo({ type_value: null, type_name: null });
    expect(info.cssClass).toBe('bp-toc-match--neutral');
  });

  it('should compute match count for result', () => {
    component.resultTypeId = 1;
    const tr = {
      indicators: [
        { type_value: '%Number of Policy%', type_name: 'Policy', matchInfo: component.getIndicatorMatchInfo({ type_value: '%Number of Policy%', type_name: 'Policy' }) },
        { type_value: '%Number of innovations%', type_name: 'Innovations' },
      ],
    };
    const match = component.getMatchesForResult(tr);
    expect(match.count).toBe(1);
  });
});
