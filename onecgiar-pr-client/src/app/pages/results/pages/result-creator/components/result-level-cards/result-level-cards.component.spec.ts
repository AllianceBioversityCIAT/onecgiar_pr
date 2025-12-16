import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ResultLevelCardsComponent } from './result-level-cards.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { ResultLevelService } from '../../services/result-level.service';
import { signal } from '@angular/core';
import { ResultLevel } from '../../../../../../shared/interfaces/result.interface';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ResultLevelCardsComponent', () => {
  let component: ResultLevelCardsComponent;
  let fixture: ComponentFixture<ResultLevelCardsComponent>;
  let mockApiService: jest.Mocked<ApiService>;
  let mockResultLevelService: jest.Mocked<ResultLevelService>;
  let mockChangeDetectorRef: jest.Mocked<ChangeDetectorRef>;

  const mockResultLevels: ResultLevel[] = [
    {
      id: 3,
      name: 'Outcome',
      description: 'Outcome description',
      result_type: [],
      selected: false
    },
    {
      id: 4,
      name: 'Output',
      description: 'Output description',
      result_type: [],
      selected: false
    }
  ];

  beforeEach(async () => {
    mockApiService = {} as jest.Mocked<ApiService>;

    const outputOutcomeLevelsSignal = signal<ResultLevel[]>(mockResultLevels);
    mockResultLevelService = {
      outputOutcomeLevelsSig: outputOutcomeLevelsSignal,
      onSelectResultLevel: jest.fn()
    } as any;

    mockChangeDetectorRef = {
      markForCheck: jest.fn(),
      detach: jest.fn(),
      detectChanges: jest.fn(),
      checkNoChanges: jest.fn(),
      reattach: jest.fn()
    };

    await TestBed.configureTestingModule({
      declarations: [ResultLevelCardsComponent],
      imports: [HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: ResultLevelService, useValue: mockResultLevelService },
        { provide: ChangeDetectorRef, useValue: mockChangeDetectorRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultLevelCardsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize without errors', () => {
      expect(() => component.ngOnInit()).not.toThrow();
    });
  });

  describe('ngOnDestroy', () => {
    it('should destroy without errors when effectRef is undefined', () => {
      component['effectRef'] = undefined;
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Input properties', () => {
    it('should accept currentResultType input', () => {
      const mockResultType = {
        id: 1,
        name: 'Test Type',
        description: 'Test Description',
        result_level_id: 3
      };

      component.currentResultType = mockResultType;

      expect(component.currentResultType).toEqual(mockResultType);
    });

    it('should accept hideAlert input', () => {
      component.hideAlert = true;

      expect(component.hideAlert).toBe(true);
    });

    it('should have default values for inputs', () => {
      expect(component.currentResultType).toBeNull();
      expect(component.hideAlert).toBe(false);
    });
  });
});
