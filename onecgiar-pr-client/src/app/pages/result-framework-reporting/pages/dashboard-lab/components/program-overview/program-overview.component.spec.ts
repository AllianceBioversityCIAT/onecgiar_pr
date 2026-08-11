import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ProgramOverviewComponent,
  StatusSegment,
  AowProgressRow,
  AttentionRow,
  CategoryBar,
  CountryRow,
  PaceSeries
} from './program-overview.component';

describe('ProgramOverviewComponent', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;
  let component: ProgramOverviewComponent;

  const segments: StatusSegment[] = [
    { key: 'in-progress', label: 'In progress', count: 6, bg: '#fef3c7', fg: '#b45309' },
    { key: 'submitted', label: 'Submitted', count: 1, bg: '#dbeafe', fg: '#1d4ed8' },
    { key: 'approved', label: 'Approved', count: 0, bg: '#d1fae5', fg: '#047857' }
  ];

  const aows: AowProgressRow[] = [
    { code: 'AOW06', name: 'Data', done: 0, total: 2 },
    { code: 'AOW01', name: 'Market', done: 3, total: 8 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programName', 'Breeding for Tomorrow');
    fixture.componentRef.setInput('statusSegments', segments);
    fixture.componentRef.setInput('aowProgress', aows);
    fixture.componentRef.setInput('categories', [
      { name: 'Knowledge product', count: 11, color: 'var(--pr-chart-1)' }
    ] satisfies CategoryBar[]);
    fixture.componentRef.setInput('countries', [
      { name: 'Kenya', count: 8, color: 'var(--pr-chart-1)' },
      { name: 'Ethiopia', count: 7, color: 'var(--pr-chart-2)' }
    ] satisfies CountryRow[]);
    fixture.detectChanges();
  });

  it('renders the six CURRENT Overview blocks (no Largest gaps)', () => {
    const headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());

    expect(headings).toEqual([
      'About this program',
      'Reporting status',
      'Reporting pace',
      'Progress by area of work',
      'Needs attention',
      'Impact so far'
    ]);
  });

  it('uses the programme name in the fallback description', () => {
    expect(component.description()).toContain('Breeding for Tomorrow');
  });

  it('sizes each status segment against the total count', () => {
    expect(component.statusTotal()).toBe(7);
    expect(component.segmentWidth(segments[0])).toBeCloseTo((6 / 7) * 100);
  });

  it('never divides by zero when nothing has been reported', () => {
    fixture.componentRef.setInput('statusSegments', [
      { key: 'x', label: 'x', count: 0, bg: '', fg: '' }
    ]);
    fixture.detectChanges();
    expect(component.statusTotal()).toBe(0);
    expect(component.segmentWidth(component.statusSegments()[0])).toBe(0);
  });

  it('lists areas of work least complete first when parent sorts that way', () => {
    const percents = component.aowProgress().map(row => component.percentOf(row));
    expect(percents[0]).toBeLessThanOrEqual(percents[1]);
  });

  it('scales country and category bars against their own maximum', () => {
    const [kenya, ethiopia] = component.countries();
    expect(component.countryWidth(kenya)).toBe(100);
    expect(component.countryWidth(ethiopia)).toBeCloseTo((7 / 8) * 100);
    expect(component.categoryHeight(component.categories()[0])).toBe(130);
  });

  it('treats an area of work with no planned indicators as 0%', () => {
    expect(component.percentOf({ code: 'AOW09', name: 'Empty', done: 0, total: 0 })).toBe(0);
  });

  describe('status meter', () => {
    it('only prints the count inside segments wider than 8% of the bar', () => {
      // 6/7 is wide; 1/7 (14%) is still wide; a 1-in-40 sliver is not.
      expect(component.showsSegmentCount(segments[0])).toBe(true);
      expect(component.showsSegmentCount(segments[2])).toBe(false);

      fixture.componentRef.setInput('statusSegments', [
        { key: 'a', label: 'A', count: 38, bg: '', fg: '' },
        { key: 'b', label: 'B', count: 1, bg: '', fg: '' },
        { key: 'c', label: 'C', count: 1, bg: '', fg: '' }
      ] satisfies StatusSegment[]);
      fixture.detectChanges();

      const narrow = component.statusSegments().slice(1);
      expect(narrow.map(s => component.showsSegmentCount(s))).toEqual([false, false]);
      // Exactly one number on screen — the two slivers must not stack their labels.
      const printed = fixture.nativeElement.querySelectorAll('.pr-figure-sm.font-semibold');
      expect(printed.length).toBe(1);
    });

    it('renders a legend entry for every segment, including zero-count ones', () => {
      const legend = Array.from(fixture.nativeElement.querySelectorAll('.rounded-full')).length;
      expect(legend).toBe(segments.length);
    });
  });

  describe('needs attention', () => {
    it('gives every alert kind its own icon and colour', () => {
      const rows: AttentionRow[] = [
        { kind: 'stale-drafts', text: '4 results still in Editing' },
        { kind: 'empty-aow', text: '3 areas of work with no results reported yet' },
        { kind: 'missing-evidence', text: '2 results are missing evidence links' }
      ];
      fixture.componentRef.setInput('attention', rows);
      fixture.detectChanges();

      const names = rows.map(r => component.attentionIcon(r));
      expect(names).toEqual(['lucideClock', 'lucideCircleDot', 'lucideFileText']);
      expect(new Set(names).size).toBe(3);
      expect(component.attentionColor(rows[0])).not.toBe(component.attentionColor(rows[2]));
      expect(fixture.nativeElement.querySelectorAll('ng-icon').length).toBe(3);
    });
  });

  describe('reporting pace', () => {
    const series = (patch: Partial<PaceSeries>): PaceSeries => ({
      done: 0,
      total: 0,
      elapsedWeeks: 0,
      leftWeeks: 0,
      inProgress: 0,
      inQa: 0,
      submitted: 0,
      ...patch
    });

    const setSeries = (patch: Partial<PaceSeries>) => {
      fixture.componentRef.setInput('paceSeries', series(patch));
      fixture.detectChanges();
    };

    it('projects the finish date against the deadline when the cycle dates are known', () => {
      // 20 done in 10 weeks = 2/wk; 20 left needs 10 more weeks but only 5 remain → 35 days late.
      setSeries({ done: 20, total: 40, elapsedWeeks: 10, leftWeeks: 5 });

      expect(component.paceHeadline()).toBe("At this pace you'll finish 35 days after the deadline.");
      expect(component.paceSub()).toBe('You need 4 results per week to close on time. Current pace: 2.');
    });

    it('says the program will finish early when the pace is ahead', () => {
      setSeries({ done: 30, total: 40, elapsedWeeks: 10, leftWeeks: 10 });
      expect(component.paceHeadline()).toBe("At this pace you'll finish 47 days before the deadline.");
    });

    it('never invents a deadline when the cycle dates are missing', () => {
      setSeries({ done: 8, total: 40, inProgress: 30, inQa: 1, submitted: 1 });

      expect(component.paceHeadline()).toBe('8 of 40 results have moved past Not started.');
      expect(component.paceSub()).toBe('30 still in progress · 1 in QA · 1 submitted.');
      expect(component.paceChart().projD).toBe('');
      expect(component.paceChart().deadlineX).toBeNull();
    });

    it('falls back to the empty copy with no results at all', () => {
      setSeries({});
      expect(component.paceHeadline()).toBe('No results reported for this phase yet.');
      expect(component.paceSub()).toBe('Start reporting against the planned ToC to build pace.');
    });

    it('reports an untouched cycle', () => {
      setSeries({ done: 0, total: 12, elapsedWeeks: 3, leftWeeks: 4 });
      expect(component.paceHeadline()).toBe('Nothing has been reported yet in this cycle.');
    });

    it('derives the sparkline from the data instead of a hard-coded path', () => {
      setSeries({ done: 10, total: 40, elapsedWeeks: 4, leftWeeks: 4 });
      const half = component.paceChart();

      setSeries({ done: 35, total: 40, elapsedWeeks: 4, leftWeeks: 4 });
      const most = component.paceChart();

      // More progress ⇒ the line ends higher (smaller y) in the same viewBox.
      expect(most.pointY).toBeLessThan(half.pointY);
      expect(half.lineD).toMatch(/^M0 82 L\d/);
      expect(half.areaD.endsWith('Z')).toBe(true);
      expect(half.deadlineX).toBeGreaterThan(0);
      expect(half.projD).not.toBe('');
    });
  });
});
