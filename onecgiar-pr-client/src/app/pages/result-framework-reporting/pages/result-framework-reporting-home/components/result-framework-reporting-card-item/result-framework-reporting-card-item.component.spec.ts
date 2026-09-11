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
});
