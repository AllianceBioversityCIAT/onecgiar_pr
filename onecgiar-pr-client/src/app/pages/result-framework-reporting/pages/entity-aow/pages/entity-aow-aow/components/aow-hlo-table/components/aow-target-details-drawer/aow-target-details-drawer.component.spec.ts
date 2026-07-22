import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AowTargetDetailsDrawerComponent } from './aow-target-details-drawer.component';
import { EntityAowService } from '../../../../../../services/entity-aow.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AowTargetDetailsDrawerComponent', () => {
  let component: AowTargetDetailsDrawerComponent;
  let fixture: ComponentFixture<AowTargetDetailsDrawerComponent>;
  let mockEntityAowService: jest.Mocked<EntityAowService>;

  beforeEach(async () => {
    mockEntityAowService = {
      entityId: signal<string>('test-entity-id'),
      entityDetails: signal<any>({ name: 'Test Entity' }),
      currentAowSelected: jest.fn(() => ({ code: 'TEST-AOW', name: 'Test AOW' })),
      showTargetDetailsDrawer: signal<boolean>(true),
      targetDetailsDrawerFullScreen: signal<boolean>(false),
      targetDetailsSelectedCenterId: signal<string | number | null>(3),
      currentTargetToView: signal<any>({
        result_title: 'Test Result',
        indicators: [
          {
            indicator_description: 'Test Indicator',
            targets_by_center: {
              centers: [
                {
                  center_id: '1',
                  center_acronym: 'ABC',
                  center_name: 'Alliance of Bioversity and CIAT - Headquarter',
                  targets: [
                    { number_target: '1', target_value: '95', toc_indicator_target_id: '1', year: '2026' },
                    { number_target: '1', target_value: '0', toc_indicator_target_id: '2', year: '2025' }
                  ]
                },
                {
                  center_id: '3',
                  center_acronym: 'CIP',
                  center_name: 'International Potato Center',
                  targets: [{ number_target: '1', target_value: '79', toc_indicator_target_id: '3', year: '2026' }]
                }
              ]
            }
          }
        ]
      })
    } as any;

    await TestBed.configureTestingModule({
      imports: [AowTargetDetailsDrawerComponent, HttpClientTestingModule],
      providers: [
        { provide: EntityAowService, useValue: mockEntityAowService },
        provideNoopAnimations()
      ]
    }).compileComponents();

    jest.spyOn(mockEntityAowService.showTargetDetailsDrawer, 'set');
    jest.spyOn(mockEntityAowService.targetDetailsDrawerFullScreen, 'set');
    jest.spyOn(mockEntityAowService.targetDetailsSelectedCenterId, 'set');

    fixture = TestBed.createComponent(AowTargetDetailsDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build years from all center targets', () => {
    expect(component.years()).toEqual(['2025', '2026']);
  });

  it('should pivot target values per center and year', () => {
    const rows = component.tableData();

    expect(rows).toHaveLength(2);
    expect(component.getTargetValue(rows[0], '2026')).toBe('95');
    expect(component.getTargetValue(rows[0], '2025')).toBe('0');
    expect(component.getTargetValue(rows[1], '2026')).toBe('79');
    expect(component.getTargetValue(rows[1], '2025')).toBe('');
  });

  it('should highlight the selected center row', () => {
    const rows = component.tableData();

    expect(component.isSelectedCenter(rows[0])).toBe(false);
    expect(component.isSelectedCenter(rows[1])).toBe(true);
  });

  it('should clear selected center when drawer closes', () => {
    component.closeDrawer();

    expect(mockEntityAowService.showTargetDetailsDrawer.set).toHaveBeenCalledWith(false);
    expect(mockEntityAowService.targetDetailsSelectedCenterId.set).toHaveBeenCalledWith(null);
  });

  it('should not highlight rows when no center is selected', () => {
    mockEntityAowService.targetDetailsSelectedCenterId.set(null);

    const rows = component.tableData();

    expect(component.isSelectedCenter(rows[0])).toBe(false);
    expect(component.isSelectedCenter(rows[1])).toBe(false);
  });

  it('should clear selected center on destroy', () => {
    component.ngOnDestroy();

    expect(mockEntityAowService.targetDetailsSelectedCenterId.set).toHaveBeenCalledWith(null);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('should ignore invalid targets_by_center shapes', () => {
    mockEntityAowService.currentTargetToView.set({
      result_title: 'Test Result',
      indicators: [{ indicator_description: 'Test', targets_by_center: { centers: null } }]
    });
    fixture.detectChanges();

    expect(component.years()).toEqual([]);
    expect(component.tableData()).toEqual([]);
  });

  it('should skip targets with empty year or value', () => {
    mockEntityAowService.currentTargetToView.set({
      result_title: 'Test Result',
      indicators: [
        {
          indicator_description: 'Test',
          targets_by_center: {
            centers: [
              {
                center_id: '1',
                center_acronym: 'ABC',
                center_name: 'Center A',
                targets: [
                  { number_target: '1', target_value: '10', toc_indicator_target_id: '1', year: '' },
                  { number_target: '1', target_value: '', toc_indicator_target_id: '2', year: '2026' },
                  { number_target: '1', target_value: '55', toc_indicator_target_id: '3', year: '2027' }
                ]
              }
            ]
          }
        }
      ]
    });
    fixture.detectChanges();

    expect(component.years()).toEqual(['2026', '2027']);
    expect(component.getTargetValue(component.tableData()[0], '2026')).toBe('');
    expect(component.getTargetValue(component.tableData()[0], '2027')).toBe('55');
  });
});
