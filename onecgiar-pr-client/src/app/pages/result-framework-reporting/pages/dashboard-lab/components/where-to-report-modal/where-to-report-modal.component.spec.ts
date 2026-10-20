import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { WhereToReportModalComponent } from './where-to-report-modal.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { EntityAowService } from '../../../entity-aow/services/entity-aow.service';
import { ReportingEntryHubComponent } from '../reporting-entry-hub/reporting-entry-hub.component';

describe('WhereToReportModalComponent', () => {
  let fixture: ComponentFixture<WhereToReportModalComponent>;
  let component: WhereToReportModalComponent;
  let apiMock: any;
  let routerMock: any;
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
        ),
        GET_ResultToReview: jest.fn().mockReturnValue(
          of({
            response: [{ project_id: 1, project_name: 'Project 1', results: [{ id: 10 }] }]
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
    expect(apiMock.resultsSE.GET_ResultToReview).toHaveBeenCalledWith('SP01', undefined, 36);
    expect(apiMock.resultsSE.GET_ScienceProgramTocProgress).toHaveBeenCalledWith('SP01', 36);
    expect(component.reportedResultsByProjectId().get('1')).toBe(1);
    expect(component.aowRows().length).toBe(1);
    expect(component.aowRows()[0].code).toBe('AOW01');
    expect(component.programLevelRows().length).toBe(2);
  });

  it('KPC-S-11.1: sorts AoWs by the server percent ascending (tie code), not done/total, and fills row.percent for the hub bar', async () => {
    // done/total would order A (1/4 = 25 %) before B (3/4 = 75 %) ... the server % says the opposite.
    apiMock.resultsSE.GET_ScienceProgramTocProgress.mockReturnValue(
      of({
        response: {
          areas: [
            { code: 'AOW03', name: 'Three', progress: { done: 2, total: 4, progress_value: 75 } },
            { code: 'AOW01', name: 'One', progress: { done: 3, total: 4, progress_value: 10 } },
            { code: 'AOW02', name: 'Two', progress: { done: 1, total: 4, achieved_value: 37.5, progress_value: 99 } },
            { code: 'AOW00', name: 'Zero', progress: { done: 0, total: 0 } },
            { code: 'AOW04', name: 'Four', progress: { done: 1, total: 4, progress_value: 75 } }
          ]
        }
      })
    );
    component.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const rows = component.aowRows();
    expect(rows.map(r => r.code)).toEqual(['AOW00', 'AOW01', 'AOW02', 'AOW03', 'AOW04']);
    expect(rows.map(r => r.percent)).toEqual([0, 10, 37.5, 75, 75]);
    // displayed counts unchanged
    expect(rows.find(r => r.code === 'AOW01')).toEqual(expect.objectContaining({ done: 3, total: 4 }));
    // the shared hub bar reads the server value, never 0 when the server sent a figure (Pivot T-4)
    const percentOf = (row: any) => ReportingEntryHubComponent.prototype.percentOf.call({}, row);
    expect(percentOf(rows.find(r => r.code === 'AOW02'))).toBe(37.5);
  });

  it('program-level rows take percent / progressSum from buildRatio (Pivot T-4)', async () => {
    component.visible.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const rows = component.programLevelRows();
    // intermediate: target 1 / achieved 1 -> 100 ; 2030: target 2 / achieved 0 -> 0
    expect(rows.find(r => r.kind === 'intermediate')).toEqual(expect.objectContaining({ percent: 100, progressSum: 100 }));
    expect(rows.find(r => r.kind === '2030')).toEqual(expect.objectContaining({ percent: 0, progressSum: 0 }));
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

});
