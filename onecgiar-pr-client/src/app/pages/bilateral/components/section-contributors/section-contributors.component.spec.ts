import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { SectionContributorsComponent } from './section-contributors.component';
import { BilateralCreationService } from '../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../services/bilateral-auto-save.service';
import { CentersService } from '../../../../shared/services/global/centers.service';
import { ApiService } from '../../../../shared/services/api/api.service';

describe('SectionContributorsComponent', () => {
  let component: SectionContributorsComponent;
  let autoSave: {
    schedulePayload: jest.Mock;
    saveContributors: jest.Mock;
    fieldStatus: ReturnType<typeof signal>;
  };
  let mdsTracker: { setTotalFields: jest.Mock; updateSection: jest.Mock };

  beforeEach(async () => {
    autoSave = {
      schedulePayload: jest.fn(),
      saveContributors: jest.fn(),
      fieldStatus: signal({}),
    };
    mdsTracker = { setTotalFields: jest.fn(), updateSection: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [SectionContributorsComponent],
      providers: [
        {
          provide: BilateralCreationService,
          useValue: {
            selectedPrimarySp: signal({
              programCode: 'SP1',
              allocation: '10',
              shortName: 'SP',
              name: 'Science',
              programId: 1,
            }),
            selectedSecondarySps: signal([]),
            selectedProject: signal({
              id: 100,
              shortName: 'Lead',
              fullName: 'Lead Project',
              leadCenter: { id: 501 },
              sciencePrograms: [],
            }),
            resultLeadCenterId: signal(501),
            resultLevelId: signal(2),
            resultTypeId: signal(6),
            resultInitiativeId: signal(null),
            resultContributingCenterIds: signal<number[]>([]),
            resultContributingProjectIds: signal<number[]>([]),
            resultContributingProjects: signal([]),
            currentResultId: signal(1),
            isLoadingResult: signal(false),
          },
        },
        { provide: BilateralMdsTrackerService, useValue: mdsTracker },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        {
          provide: CentersService,
          useValue: {
            centersList: [
              { institutionId: 501, code: 'ABC', name: 'Center A', acronym: 'ABC' },
              { institutionId: 502, code: 'DEF', name: 'Center B', acronym: 'DEF' },
            ],
            loadedCenters: new Subject<void>(),
            getData: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ApiService,
          useValue: {
            resultsSE: {
              GET_ClarisaProjects: jest.fn().mockReturnValue(
                of({
                  response: [
                    { id: 100, shortName: 'Lead', fullName: 'Lead Project' },
                    { id: 200, shortName: 'Other', fullName: 'Other Project' },
                  ],
                })
              ),
              GET_tocLevels: jest.fn().mockReturnValue(of({ response: [] })),
              GET_tocResults: jest.fn().mockReturnValue(of({ response: [] })),
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SectionContributorsComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  it('should not PATCH contributors on mount / hydrate', fakeAsync(() => {
    tick();
    component.hydrateLeadAndSelection();
    expect(autoSave.schedulePayload).not.toHaveBeenCalled();
    expect(autoSave.saveContributors).not.toHaveBeenCalled();
  }));

  it('should hydrate lead center and project without saving', fakeAsync(() => {
    tick();
    component.hydrateLeadAndSelection();
    expect(component.readonlyLeadCenterInstitutionId).toBe(501);
    expect(component.readonlyLeadProjectId).toBe(100);
    expect(component.selectedCenterInstitutionIds).toContain(501);
    expect(component.selectedProjectIds).toContain(100);
    expect(autoSave.schedulePayload).not.toHaveBeenCalled();
  }));

  it('should schedule full contributors payload on centers change', () => {
    component.readonlyLeadCenterInstitutionId = 501;
    component.readonlyLeadProjectId = 100;
    component.selectedProjectIds = [100];
    component.availableCenters = [
      { institutionId: 501, code: 'ABC', name: 'Center A', acronym: 'ABC', full_name: 'ABC - Center A' },
      { institutionId: 502, code: 'DEF', name: 'Center B', acronym: 'DEF', full_name: 'DEF - Center B' },
    ];

    component.onCentersChange([501, 502]);

    expect(autoSave.schedulePayload).toHaveBeenCalledWith(
      'contributors',
      {
        contributing_center: [{ institution_id: 501 }, { institution_id: 502 }],
        contributing_bilateral_projects: [{ project_id: 100, is_lead: true }],
      },
      { debounceMs: 400, statusKey: 'contributors' }
    );
  });
});
