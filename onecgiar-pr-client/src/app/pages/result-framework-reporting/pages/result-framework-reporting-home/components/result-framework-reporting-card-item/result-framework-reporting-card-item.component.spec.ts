import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResultFrameworkReportingCardItemComponent } from './result-framework-reporting-card-item.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';

describe('ResultFrameworkReportingCardItemComponent', () => {
  let component: ResultFrameworkReportingCardItemComponent;
  let fixture: ComponentFixture<ResultFrameworkReportingCardItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [],
      providers: [],
      imports: [ResultFrameworkReportingCardItemComponent, HttpClientTestingModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(ResultFrameworkReportingCardItemComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.imageLoadError()).toBe(false);
  });

  // ---------------------------------------------------------------- displayName
  describe('displayName', () => {
    it('returns the short name for the SGP-02 project matched by initiativeId', () => {
      component.item = { initiativeId: 41, initiativeCode: 'ANY', initiativeShortName: 'AVISA', initiativeName: 'Long AVISA name' } as any;
      expect(component.displayName).toBe('AVISA');
    });

    it('returns the short name for the SGP-02 project matched by initiativeCode', () => {
      component.item = { initiativeId: 99, initiativeCode: 'SGP-02', initiativeShortName: 'AVISA', initiativeName: 'Long' } as any;
      expect(component.displayName).toBe('AVISA');
    });

    it('falls back to initiativeName when the short name is missing on SGP-02', () => {
      component.item = { initiativeId: 41, initiativeCode: 'SGP-02', initiativeShortName: null, initiativeName: 'Long AVISA name' } as any;
      expect(component.displayName).toBe('Long AVISA name');
    });

    it('returns the full name for any other program', () => {
      component.item = { initiativeId: 7, initiativeCode: 'SP01', initiativeShortName: 'Short', initiativeName: 'Full name' } as any;
      expect(component.displayName).toBe('Full name');
    });

    it('is undefined when there is no item at all', () => {
      component.item = undefined as any;
      expect(component.displayName).toBeUndefined();
    });
  });

  // --------------------------------------------------------------- totalResults
  describe('totalResults', () => {
    it('returns the reported total', () => {
      component.item = { totalResults: 12 } as any;
      expect(component.totalResults).toBe(12);
    });

    it('falls back to 0 when totalResults is null', () => {
      component.item = { totalResults: null } as any;
      expect(component.totalResults).toBe(0);
    });

    it('falls back to 0 when there is no item', () => {
      component.item = undefined as any;
      expect(component.totalResults).toBe(0);
    });
  });

  // ------------------------------------------------------------- statusSegments
  describe('statusSegments', () => {
    it('returns an empty array when there is no item', () => {
      component.item = undefined as any;
      expect(component.statusSegments()).toEqual([]);
    });

    it('returns an empty array when versions is undefined', () => {
      component.item = { versions: undefined } as any;
      expect(component.statusSegments()).toEqual([]);
    });

    it('returns an empty array when a version carries no statuses', () => {
      component.item = { versions: [{ statuses: undefined }, null] } as any;
      expect(component.statusSegments()).toEqual([]);
    });

    it('returns an empty array when every status count is zero', () => {
      component.item = { versions: [{ statuses: [{ statusId: 1, statusName: 'Editing', count: 0 }] }] } as any;
      expect(component.statusSegments()).toEqual([]);
    });

    it('aggregates the same status across versions and computes percentages', () => {
      component.item = {
        versions: [
          { statuses: [{ statusId: 1, statusName: 'Editing', count: 2 }] },
          {
            statuses: [
              { statusId: 1, statusName: 'Editing', count: 2 },
              { statusId: 3, statusName: 'Submitted', count: 4 }
            ]
          }
        ]
      } as any;

      const segments = component.statusSegments();
      expect(segments).toHaveLength(2);
      // sorted by STATUS_META order → Submitted (order 2) before Editing (order 4)
      expect(segments[0].statusId).toBe(3);
      expect(segments[0].count).toBe(4);
      expect(segments[0].pct).toBe(50);
      expect(segments[0].label).toBe('Submitted');
      expect(segments[1].statusId).toBe(1);
      expect(segments[1].count).toBe(4);
      expect(segments[1].label).toBe('Editing');
      // the `order` helper key must not leak into the public segment
      expect((segments[0] as any).order).toBeUndefined();
    });

    it('falls back to the raw status name and neutral classes for an unknown status id', () => {
      component.item = { versions: [{ statuses: [{ statusId: 999, statusName: 'Mystery', count: 5 }] }] } as any;

      const [segment] = component.statusSegments();
      expect(segment.label).toBe('Mystery');
      expect(segment.fullLabel).toBe('Mystery');
      expect(segment.pct).toBe(100);
      expect(segment.barClass).toBe('bg-[var(--pr-color-accents-3)]');
      expect(segment.chipClass).toBe('bg-[var(--pr-color-accents-1)] text-[var(--pr-color-accents-6)]');
      expect(segment.dotClass).toBe('bg-[var(--pr-color-accents-3)]');
    });
  });

  // -------------------------------------------------------- plannedKpisDisplay
  describe('plannedKpisDisplay', () => {
    it('returns the stringified count when plannedKpis is greater than 0', () => {
      component.item = { plannedKpis: 454 } as any;
      expect(component.plannedKpisDisplay).toBe('454');
    });

    it('returns "—" when plannedKpis is 0', () => {
      component.item = { plannedKpis: 0 } as any;
      expect(component.plannedKpisDisplay).toBe('—');
    });

    it('returns "—" when plannedKpis is null', () => {
      component.item = { plannedKpis: null } as any;
      expect(component.plannedKpisDisplay).toBe('—');
    });

    it('returns "—" when there is no item', () => {
      component.item = undefined as any;
      expect(component.plannedKpisDisplay).toBe('—');
    });
  });

  // --------------------------------------------------------- replicatedResults
  describe('replicatedResults', () => {
    it('returns the replicated count from the item', () => {
      component.item = { replicatedResults: 208 } as any;
      expect(component.replicatedResults).toBe(208);
    });

    it('falls back to 0 when replicatedResults is null', () => {
      component.item = { replicatedResults: null } as any;
      expect(component.replicatedResults).toBe(0);
    });

    it('falls back to 0 when there is no item', () => {
      component.item = undefined as any;
      expect(component.replicatedResults).toBe(0);
    });
  });

  // ---------------------------------------------------------------- newResults
  describe('newResults', () => {
    it('returns the new results count from the item', () => {
      component.item = { newResults: 5 } as any;
      expect(component.newResults).toBe(5);
    });

    it('falls back to 0 when newResults is null', () => {
      component.item = { newResults: null } as any;
      expect(component.newResults).toBe(0);
    });

    it('falls back to 0 when there is no item', () => {
      component.item = undefined as any;
      expect(component.newResults).toBe(0);
    });
  });

  // ------------------------------------------------------ DOM Template Rendering
  describe('DOM Template Rendering', () => {
    it('renders Tier 1 planned KPIs pill and total results (RFR-AC-1)', () => {
      component.item = {
        initiativeId: 1,
        initiativeCode: 'SP01',
        initiativeName: 'Breeding for Tomorrow',
        totalResults: 208,
        plannedKpis: 454,
        replicatedResults: 208,
        newResults: 0,
        versions: [{ statuses: [{ statusId: 1, statusName: 'Editing', count: 208 }] }]
      } as any;
      component.homeService.compactView.set(false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('208');
      expect(el.textContent).toContain('results this phase');
      expect(el.textContent).toContain('454 planned KPIs');
      expect(el.textContent).toContain('208 replicated');
      expect(el.textContent).toContain('0 new');
    });

    it('renders breakdown correctly when new results exist (RFR-AC-3)', () => {
      component.item = {
        initiativeId: 1,
        initiativeCode: 'SP01',
        initiativeName: 'Breeding for Tomorrow',
        totalResults: 105,
        plannedKpis: 120,
        replicatedResults: 100,
        newResults: 5,
        versions: []
      } as any;
      component.homeService.compactView.set(false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('100 replicated');
      expect(el.textContent).toContain('5 new');
      expect(component.replicatedResults + component.newResults).toBe(component.totalResults);
    });

    it('renders "— planned KPIs" when plannedKpis is null or 0 (RFR-AC-5)', () => {
      component.item = {
        initiativeId: 1,
        initiativeCode: 'SP01',
        initiativeName: 'Breeding for Tomorrow',
        totalResults: 10,
        plannedKpis: 0,
        replicatedResults: 10,
        newResults: 0,
        versions: []
      } as any;
      component.homeService.compactView.set(false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('— planned KPIs');
    });

    it('renders "No results reported yet" and planned KPIs pill when totalResults is 0', () => {
      component.item = {
        initiativeId: 1,
        initiativeCode: 'SP01',
        initiativeName: 'Breeding for Tomorrow',
        totalResults: 0,
        plannedKpis: 30,
        replicatedResults: 0,
        newResults: 0,
        versions: []
      } as any;
      component.homeService.compactView.set(false);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.textContent).toContain('No results reported yet');
      expect(el.textContent).toContain('30 planned KPIs');
    });

    it('collapses Tier 2 origin pills and status bar in compact view while keeping Tier 1 metrics (RFR-AC-4)', () => {
      component.item = {
        initiativeId: 1,
        initiativeCode: 'SP01',
        initiativeName: 'Breeding for Tomorrow',
        totalResults: 208,
        plannedKpis: 454,
        replicatedResults: 208,
        newResults: 0,
        versions: [{ statuses: [{ statusId: 1, statusName: 'Editing', count: 208 }] }]
      } as any;
      component.homeService.compactView.set(true);
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      // Tier 1 still rendered
      expect(el.textContent).toContain('208');
      expect(el.textContent).toContain('results this phase');
      expect(el.textContent).toContain('454 planned KPIs');

      // Tier 2 origin pills collapsed
      expect(el.textContent).not.toContain('replicated');
      expect(el.textContent).not.toContain('new');
      expect(el.querySelector('.pr-card-meta')).toBeNull();
    });
  });
});
