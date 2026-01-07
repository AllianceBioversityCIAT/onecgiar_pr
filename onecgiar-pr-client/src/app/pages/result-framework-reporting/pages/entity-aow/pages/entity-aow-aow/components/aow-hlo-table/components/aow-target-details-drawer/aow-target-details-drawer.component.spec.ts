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
      currentTargetToView: signal<any>({
        result_title: 'Test Result',
        indicators: [
          {
            indicator_description: 'Test Indicator',
            targets_by_center: {
              centers: [
                { center_id: '1', center_acronym: 'CIP', center_name: 'International Potato Center' }
              ],
              targets: [
                { number_target: '1', target_value: '10', toc_indicator_target_id: '1', year: '2025' }
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

    fixture = TestBed.createComponent(AowTargetDetailsDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
