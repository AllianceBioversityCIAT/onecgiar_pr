import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { BilateralResultCreatorComponent } from './bilateral-result-creator.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { RolesService } from '../../../../shared/services/global/roles.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('BilateralResultCreatorComponent', () => {
  let component: BilateralResultCreatorComponent;
  let creationService: any;
  let mdsTracker: any;
  let autoSaveService: any;
  let rolesService: any;
  let mockRoute: any;
  let mockRouter: any;

  beforeEach(async () => {
    creationService = {
      selectedProject: signal(null),
      selectedPrimarySp: signal(null),
      projects: signal([]),
      isLoadingProjects: signal(false),
      createResult: jest.fn().mockReturnValue(of({ response: { id: 42 } })),
      submitResult: jest.fn().mockReturnValue(of({})),
      selectProject: jest.fn(),
      loadResult: jest.fn(),
    };

    mdsTracker = {
      sectionStatus: signal([]),
      overallPercentage: signal(0),
      overallStatus: signal('empty'),
      reset: jest.fn(),
    };

    autoSaveService = {
      fieldStatus: signal({}),
      hasPendingSaves: signal(false),
      setResultId: jest.fn(),
      registerField: jest.fn(),
      updateField: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn(),
    };

    rolesService = {
      getMyCenters: jest.fn().mockReturnValue([]),
    };

    mockRoute = {
      params: of({}),
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [BilateralResultCreatorComponent, HttpClientTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: BilateralCreationService, useValue: creationService },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSaveService },
        { provide: RolesService, useValue: rolesService },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BilateralResultCreatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in creating mode by default', () => {
    expect(component.isCreating()).toBe(true);
    expect(component.resultId()).toBeNull();
  });

  it('should handle result level selection', () => {
    component.onLevelSelected(3);
    expect(component.resultLevelId()).toBe(3);
    expect(component.resultTypeId()).toBeNull();
  });

  it('should filter result types by selected level', () => {
    component.resultLevelId.set(3);
    expect(component.availableResultTypes().length).toBe(3);
    expect(component.availableResultTypes()[0].label).toBe('Policy Change');
  });

  it('should return empty array for unsupported level', () => {
    component.resultLevelId.set(1);
    expect(component.availableResultTypes().length).toBe(0);
  });

  it('should show output types for level 4', () => {
    component.resultLevelId.set(4);
    expect(component.availableResultTypes().length).toBe(4);
    expect(component.availableResultTypes().find(t => t.id === 6)!.label).toBe('Knowledge Product');
  });

  it('should emit submit action', () => {
    component.resultId.set(42);
    component.submitResult();
    expect(creationService.submitResult).toHaveBeenCalledWith(42);
  });

  it('should create result and navigate to editor', () => {
    component.resultLevelId.set(3);
    component.resultTypeId.set(2);
    creationService.selectedPrimarySp.set({ programId: 100 });
    component.createResult();
    expect(creationService.createResult).toHaveBeenCalledWith(3, 2);
  });

  it('should have null reporting way by default', () => {
    expect(component.selectedReportingWay()).toBeNull();
  });

  it('should set reporting way on selection', () => {
    component.onReportingWaySelected('manual');
    expect(component.selectedReportingWay()).toBe('manual');
  });

  it('should not trigger create on reporting way selection', () => {
    component.onReportingWaySelected('manual');
    expect(creationService.createResult).not.toHaveBeenCalled();
  });

  it('should set type without creating on type selection', () => {
    component.selectedReportingWay.set('manual');
    component.resultLevelId.set(3);
    creationService.selectedPrimarySp.set({ programId: 100 });
    const event = { target: { value: '2' } } as any;
    component.onTypeSelected(event);
    expect(component.resultTypeId()).toBe(2);
    expect(creationService.createResult).not.toHaveBeenCalled();
  });

  it('should create result on next click', () => {
    component.selectedReportingWay.set('manual');
    component.resultLevelId.set(3);
    component.resultTypeId.set(2);
    creationService.selectedPrimarySp.set({ programId: 100 });
    component.onNext();
    expect(creationService.createResult).toHaveBeenCalledWith(3, 2);
  });

  it('should reset reporting way on project change', () => {
    component.selectedReportingWay.set('manual');
    component.onProjectSelected({} as any);
    expect(component.selectedReportingWay()).toBeNull();
  });
});
