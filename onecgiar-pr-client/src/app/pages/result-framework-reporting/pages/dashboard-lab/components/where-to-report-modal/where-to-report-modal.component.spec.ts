import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { WhereToReportModalComponent } from './where-to-report-modal.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { EntityAowService } from '../../../entity-aow/services/entity-aow.service';
import { BilateralCreationService } from '../../../../../bilateral/services/bilateral-creation.service';

describe('WhereToReportModalComponent', () => {
  let fixture: ComponentFixture<WhereToReportModalComponent>;
  let component: WhereToReportModalComponent;
  let apiMock: any;
  let routerMock: any;
  let bilateralCreationMock: any;

  beforeEach(async () => {
    apiMock = {
      resultsSE: {
        GET_reportingEntryHubProjects: jest.fn().mockReturnValue(
          of({
            response: {
              programCode: 'SP01',
              activeYear: 2026,
              truncated: false,
              centers: [
                {
                  code: 'CIAT',
                  name: 'Alliance of Bioversity and CIAT',
                  acronym: 'CIAT',
                  total: 10,
                  matching: 2,
                  projects: [
                    { id: 1, shortName: 'P1', fullName: 'Project 1', allocation: 100 }
                  ]
                }
              ]
            }
          })
        ),
        GET_ScienceProgramTocProgress: jest.fn().mockReturnValue(
          of({
            response: {
              areas: [
                { code: 'AOW01', name: 'Area 1', progress: { done: 1, total: 5, zeroTarget: 0 } }
              ]
            }
          })
        ),
        GET_IntermediateOutcomes: jest.fn().mockReturnValue(
          of({
            response: {
              tocResults: [
                { indicators: [{ indicator_id: 1, target_value_sum: 1, actual_achieved_value_sum: 1 }] }
              ]
            }
          })
        ),
        GET_2030Outcomes: jest.fn().mockReturnValue(
          of({
            response: {
              tocResults: [
                { indicators: [{ indicator_id: 2, target_value_sum: 2, actual_achieved_value_sum: 0 }] }
              ]
            }
          })
        )
      },
      rolesSE: {
        getMyCenters: jest.fn().mockReturnValue(['CIAT'])
      }
    };

    routerMock = {
      navigate: jest.fn()
    };

    bilateralCreationMock = {
      selectProject: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [WhereToReportModalComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        {
          provide: DataControlService,
          useValue: {
            reportingCurrentPhase: {
              phaseName: 'Reporting 2026 - P25',
              phaseYear: 2026,
              phaseId: 36,
              isNewPhase: true
            }
          }
        },
        {
          provide: EntityAowService,
          useValue: {
            canReportResults: jest.fn().mockReturnValue(true)
          }
        },
        { provide: BilateralCreationService, useValue: bilateralCreationMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WhereToReportModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programCode', 'SP01');
    fixture.detectChanges();
  });

  it('creates the component and does not show dialog by default', () => {
    expect(component).toBeTruthy();
    expect(component.visible()).toBe(false);
    expect(fixture.nativeElement.querySelector('.where-to-report-dialog')).toBeNull();
  });

  it('fetches W3 and AoW progress when visible becomes true', async () => {
    component.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(apiMock.resultsSE.GET_reportingEntryHubProjects).toHaveBeenCalledWith('SP01');
    expect(apiMock.resultsSE.GET_ScienceProgramTocProgress).toHaveBeenCalledWith('SP01', 36);
    expect(component.aowRows().length).toBe(1);
    expect(component.aowRows()[0].code).toBe('AOW01');
    expect(component.programLevelRows().length).toBe(2);
  });

  it('closes modal on closeModal()', () => {
    component.visible.set(true);
    fixture.detectChanges();

    component.closeModal();
    expect(component.visible()).toBe(false);
  });

  it('navigates to AoW reporting view on onReportAow', () => {
    component.visible.set(true);
    component.onReportAow('AOW01');

    expect(component.visible()).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP01'], {
      queryParams: { tocView: 'byAow', tocAow: 'AOW01' }
    });
  });

  it('navigates to emerging result with returnTab on onReportEmerging', () => {
    fixture.componentRef.setInput('returnTab', 'my-work');
    component.visible.set(true);
    component.onReportEmerging();

    expect(component.visible()).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/result-framework-reporting', 'entity-details', 'SP01'], {
      queryParams: { reportEmerging: 'true', returnTab: 'my-work' }
    });
  });

  it('selects project and navigates to bilateral create on onCreateResult', () => {
    const project = { id: 1, shortName: 'P1', fullName: 'Project 1', allocation: 100 };
    const center = { code: 'CIAT', name: 'Alliance', acronym: 'CIAT', total: 10, matching: 1, projects: [project] };

    component.visible.set(true);
    component.onCreateResult({ project, center });

    expect(component.visible()).toBe(false);
    expect(bilateralCreationMock.selectProject).toHaveBeenCalledWith(project);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/bilateral', 'CIAT', 'create']);
  });
});
