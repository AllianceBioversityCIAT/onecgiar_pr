import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EntityAowCardComponent } from './entity-aow-card.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('EntityAowCardComponent', () => {
  let component: EntityAowCardComponent;
  let fixture: ComponentFixture<EntityAowCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityAowCardComponent, HttpClientTestingModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(EntityAowCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('P2-3296 AC3 — the AoW figure on the card', () => {
    const withAreas = (areas: Record<string, any>) => {
      component.entityAowService.areaProgressByCode.set(areas);
    };

    it('picks the entry that matches this card by AoW code', () => {
      component.item = { code: 'AOW2' } as any;
      withAreas({
        AOW1: { progress_percentage: '10%' },
        AOW2: { progress_percentage: '45%', preliminary_progress_percentage: '60%' }
      });

      expect(component.progressLabel).toBe('45%');
      expect(component.preliminaryLabel).toBe('60%');
    });

    it('stays null until the call lands, so the card renders unchanged', () => {
      component.item = { code: 'AOW1' } as any;
      withAreas({});

      expect(component.progress).toBeNull();
    });

    // A level with nothing measurable is not a level at zero.
    it('shows a dash, not 0%, when the AoW has nothing measurable', () => {
      component.item = { code: 'AOW1' } as any;
      withAreas({ AOW1: { progress_percentage: null, preliminary_progress_percentage: null } });

      expect(component.progressLabel).toBe('—');
      expect(component.preliminaryLabel).toBe('—');
    });

    it('always states the denominator behind the number', () => {
      component.item = { code: 'AOW1' } as any;

      withAreas({ AOW1: { indicators_counted: 2, indicators_total: 10 } });
      expect(component.coverage).toBe('2 of 10 indicators');

      withAreas({ AOW1: { indicators_counted: 9, indicators_total: 9 } });
      expect(component.coverage).toBe('9 indicators');

      withAreas({ AOW1: { indicators_counted: 0, indicators_total: 0 } });
      expect(component.coverage).toBe('');
    });

    it('does not blow up on a card with no code', () => {
      component.item = {} as any;
      withAreas({ AOW1: { progress_percentage: '45%' } });

      expect(component.progress).toBeNull();
      expect(component.progressLabel).toBe('—');
    });
  });
});
