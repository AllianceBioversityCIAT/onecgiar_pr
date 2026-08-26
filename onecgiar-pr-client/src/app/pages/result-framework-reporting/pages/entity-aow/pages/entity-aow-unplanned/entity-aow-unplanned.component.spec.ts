import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityAowUnplannedComponent } from './entity-aow-unplanned.component';
import { EntityAowService } from '../../services/entity-aow.service';
import { signal } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('EntityAowUnplannedComponent', () => {
  let component: EntityAowUnplannedComponent;
  let fixture: ComponentFixture<EntityAowUnplannedComponent>;
  let mockEntityAowService: jest.Mocked<EntityAowService>;

  beforeEach(async () => {
    mockEntityAowService = {
      entityId: signal<string>('test-entity-id'),
      entityDetails: signal<any>({}),
      currentAowSelected: jest.fn(() => ({})),
      getIntermediateOutcomes: jest.fn(),
      tocResultsIntermediateOutcomes: signal<any[]>([]),
      searchText: signal<string>(''),
      isLoadingIntermediateOutcomes: signal<boolean>(false),
      isLoadingTocResultsByAowId: signal<boolean>(false),
      isLoadingTocResults2030Outcomes: signal<boolean>(false),
      showReportResultModal: signal<boolean>(false),
      showViewResultDrawer: signal<boolean>(false),
      viewResultDrawerFullScreen: signal<boolean>(false),
      currentResultToView: signal<any>({}),
      showTargetDetailsDrawer: signal<boolean>(false),
      targetDetailsDrawerFullScreen: signal<boolean>(false),
      currentTargetToView: signal<any>({}),
      existingResultsContributors: signal<any[]>([]),
      canReportResults: jest.fn(() => false),
      tocResults2030Outcomes: signal<any[]>([])
    } as any;

    await TestBed.configureTestingModule({
      imports: [EntityAowUnplannedComponent, HttpClientTestingModule],
      providers: [{ provide: EntityAowService, useValue: mockEntityAowService }]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAowUnplannedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should reset searchText on init', () => {
      mockEntityAowService.searchText.set('stale query');

      component.ngOnInit();

      expect(mockEntityAowService.searchText()).toBe('');
    });

    it('should call getIntermediateOutcomes with entityId from service', () => {
      const entityId = 'test-entity-id';
      mockEntityAowService.entityId.set(entityId);

      component.ngOnInit();

      expect(mockEntityAowService.getIntermediateOutcomes).toHaveBeenCalledWith(entityId);
    });

    it('should call getIntermediateOutcomes with different entityId values', () => {
      const testEntityIds = ['entity-1', 'entity-2', 'entity-123'];

      testEntityIds.forEach(entityId => {
        mockEntityAowService.entityId.set(entityId);
        (mockEntityAowService.getIntermediateOutcomes as jest.Mock).mockClear();

        component.ngOnInit();

        expect(mockEntityAowService.getIntermediateOutcomes).toHaveBeenCalledWith(entityId);
      });
    });

    it('should handle empty entityId', () => {
      mockEntityAowService.entityId.set('');

      component.ngOnInit();

      expect(mockEntityAowService.getIntermediateOutcomes).toHaveBeenCalledWith('');
    });
  });

  // P2-3336 (rules 1-2): this note IS the deliverable of the agreed AoW scoping rules, so it is
  // asserted here. These nodes carry no `wp_id`, which is why the server returns them under every
  // AoW -- claiming a mapping to particular ones would be wrong.
  describe('Shared Intermediate Outcomes note', () => {
    it('should render the informational note with its info icon', () => {
      const note = fixture.nativeElement.querySelector('.entity-aow-unplanned_note');

      expect(note).toBeTruthy();
      expect(note.querySelector('.entity-aow-unplanned_note_icon').textContent.trim()).toBe('info');
    });

    it('should say they are unassigned and appear under every Area of Work', () => {
      const text = fixture.nativeElement
        .querySelector('.entity-aow-unplanned_note_text')
        .textContent.replace(/\s+/g, ' ');

      expect(text).toContain('not assigned to a specific Area of Work');
      expect(text).toContain('every');
      expect(text).not.toContain('to which they are mapped');
    });

    it('should stay informational: the table is rendered alongside the note, not replaced by it', () => {
      expect(fixture.nativeElement.querySelector('.entity-aow-unplanned_content_table')).toBeTruthy();
    });
  });

});
