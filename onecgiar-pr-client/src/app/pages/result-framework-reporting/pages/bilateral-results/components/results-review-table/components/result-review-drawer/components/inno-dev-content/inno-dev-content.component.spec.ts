import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InnoDevContentComponent } from './inno-dev-content.component';
import { InnovationControlListService } from '../../../../../../../../../../shared/services/global/innovation-control-list.service';
import { Subject } from 'rxjs';

describe('InnoDevContentComponent', () => {
  let component: InnoDevContentComponent;
  let fixture: ComponentFixture<InnoDevContentComponent>;
  let mockInnovationControlListSE: any;
  let readinessLevelsLoaded$: Subject<void>;

  beforeEach(async () => {
    readinessLevelsLoaded$ = new Subject<void>();
    mockInnovationControlListSE = {
      typeList: [],
      readinessLevelsList: [],
      readinessLevelsLoaded$
    };

    await TestBed.configureTestingModule({
      imports: [InnoDevContentComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: InnovationControlListService, useValue: mockInnovationControlListSE }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnoDevContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('resultDetail setter', () => {
    it('should set _resultDetail to null when value is falsy', () => {
      component.resultDetail = null as any;
      expect(component.resultDetail).toBeNull();
    });

    it('should set _resultDetail to undefined when value is undefined', () => {
      component.resultDetail = undefined as any;
      expect(component.resultDetail).toBeUndefined();
    });

    it('should initialize resultTypeResponse when it is null', () => {
      const value = { resultTypeResponse: null } as any;
      component.resultDetail = value;

      expect(value.resultTypeResponse.length).toBe(1);
      expect(value.resultTypeResponse[0].innovation_nature_id).toBeNull();
      expect(value.resultTypeResponse[0].innovation_type_id).toBeNull();
    });

    it('should initialize resultTypeResponse when it is not an array', () => {
      const value = { resultTypeResponse: 'not-an-array' } as any;
      component.resultDetail = value;

      expect(Array.isArray(value.resultTypeResponse)).toBe(true);
      expect(value.resultTypeResponse[0].innovation_nature_id).toBeNull();
    });

    it('should initialize resultTypeResponse when it is an empty array', () => {
      const value = { resultTypeResponse: [] } as any;
      component.resultDetail = value;

      expect(value.resultTypeResponse.length).toBe(1);
    });

    it('should default undefined fields on existing firstItem', () => {
      const firstItem: any = {};
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;

      expect(firstItem.innovation_nature_id).toBeNull();
      expect(firstItem.innovation_type_id).toBeNull();
      expect(firstItem.innovation_type_name).toBeNull();
      expect(firstItem.innovation_developers).toBeNull();
      expect(firstItem.innovation_readiness_level_id).toBeNull();
      expect(firstItem.readinness_level_id).toBeNull();
      expect(firstItem.level).toBeNull();
      expect(firstItem.name).toBeNull();
    });

    it('should not override existing defined fields on firstItem', () => {
      const firstItem: any = {
        innovation_nature_id: 1,
        innovation_type_id: 2,
        innovation_type_name: 'TestType',
        innovation_developers: 'DevTeam',
        innovation_readiness_level_id: 3,
        readinness_level_id: 4,
        level: 'High',
        name: 'TestName'
      };
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;

      expect(firstItem.innovation_nature_id).toBe(1);
      expect(firstItem.innovation_type_id).toBe(2);
      expect(firstItem.innovation_type_name).toBe('TestType');
      expect(firstItem.innovation_developers).toBe('DevTeam');
      expect(firstItem.innovation_readiness_level_id).toBe(3);
      expect(firstItem.readinness_level_id).toBe(4);
      expect(firstItem.level).toBe('High');
      expect(firstItem.name).toBe('TestName');
    });

    it('should keep null values without overriding', () => {
      const firstItem: any = {
        innovation_nature_id: null,
        innovation_type_id: null,
        innovation_type_name: null,
        innovation_developers: null,
        innovation_readiness_level_id: null,
        readinness_level_id: null,
        level: null,
        name: null
      };
      const value = { resultTypeResponse: [firstItem] } as any;
      component.resultDetail = value;

      expect(firstItem.innovation_nature_id).toBeNull();
    });
  });

  describe('ngOnInit', () => {
    it('should call markForCheck when readinessLevelsLoaded$ emits', () => {
      const cdr = (component as any).cdr;
      const spy = jest.spyOn(cdr, 'markForCheck');

      readinessLevelsLoaded$.next();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should complete destroy$ subject', () => {
      const spy = jest.spyOn((component as any).destroy$, 'complete');
      component.ngOnDestroy();
      expect(spy).toHaveBeenCalled();
    });

    it('should stop subscription from readinessLevelsLoaded$ after destroy', () => {
      const cdr = (component as any).cdr;
      const spy = jest.spyOn(cdr, 'markForCheck');
      spy.mockClear();

      component.ngOnDestroy();
      readinessLevelsLoaded$.next();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('readinessDescription', () => {
    it('should return the description string', () => {
      const result = component.readinessDescription();
      expect(result).toContain('readiness level');
      expect(result).toContain('1 (basic research)');
      expect(result).toContain('9 (proven in operational environment)');
    });
  });
});
