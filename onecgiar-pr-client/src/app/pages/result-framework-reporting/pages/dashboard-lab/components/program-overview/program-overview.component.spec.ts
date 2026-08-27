import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ProgramOverviewComponent,
  StatusSegment,
  AowProgressRow,
  CategoryBar,
  OverviewCenterBar
} from './program-overview.component';

describe('ProgramOverviewComponent', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;
  let component: ProgramOverviewComponent;

  const segments: StatusSegment[] = [
    { key: 'in-progress', label: 'In progress', count: 6, bg: '#fef3c7', fg: '#b45309', statusName: 'Editing', link: { status: 'Editing' } },
    { key: 'submitted', label: 'Submitted', count: 1, bg: '#dbeafe', fg: '#1d4ed8', statusName: 'Submitted', link: { status: 'Submitted' } },
    { key: 'approved', label: 'Approved', count: 0, bg: '#d1fae5', fg: '#047857', statusName: 'Approved', link: null }
  ];

  const aows: AowProgressRow[] = [
    { code: 'AOW06', name: 'Data', done: 0, total: 2 },
    { code: 'AOW01', name: 'Market', done: 3, total: 8 }
  ];

  /** Mirrors the real prtest shape for SP02: 8 own categories, uncapped. */
  const categories: CategoryBar[] = [
    { name: 'Innovation development', count: 15, link: { category: 'Innovation development' } },
    { name: 'Other output', count: 10, link: { category: 'Other output' } },
    { name: 'Capacity sharing for development', count: 6, link: { category: 'Capacity sharing for development' } },
    { name: 'Innovation use', count: 6, link: { category: 'Innovation use' } },
    { name: 'Knowledge product', count: 6, link: { category: 'Knowledge product' } },
    { name: 'Policy change', count: 5, link: { category: 'Policy change' } },
    { name: 'Other outcome', count: 1, link: { category: 'Other outcome' } },
    { name: 'Innovation Packages', count: 1, link: { category: 'Innovation Packages' } }
  ];

  const bilateralCategories: CategoryBar[] = [
    { name: 'Capacity sharing for development', count: 70, link: { origin: 'W3/Bilaterals', category: 'Capacity sharing for development' } },
    { name: 'Innovation development', count: 30, link: { origin: 'W3/Bilaterals', category: 'Innovation development' } }
  ];

  const centers: OverviewCenterBar[] = [
    { name: 'CIAT', count: 45, link: { origin: 'W3/Bilaterals', center: 'CIAT' } },
    { name: 'IRRI', count: 32, link: { origin: 'W3/Bilaterals', center: 'IRRI' } },
    { name: 'CIMMYT', count: 4, link: { origin: 'W3/Bilaterals', center: 'CIMMYT' } }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programName', 'Breeding for Tomorrow');
    fixture.componentRef.setInput('statusSegments', segments);
    fixture.componentRef.setInput('aowProgress', aows);
    fixture.componentRef.setInput('categories', categories);
    fixture.componentRef.setInput('bilateralCategories', bilateralCategories);
    fixture.componentRef.setInput('bilateralCenters', centers);
    fixture.detectChanges();
  });

  /**
   * Guards the card ORDER, which is the whole point of P2-3303 ("prominent … under about this
   * program"). Any reordering has to be a deliberate edit here, never an accident.
   */
  it('renders the six Overview cards in the approved design order', () => {
    const headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());

    expect(headings).toEqual([
      'About this program',
      // P2-3481: the titles name the funding type, so a user can tell the two blocks apart.
      'W1/W2 results by indicator category',
      'W3/Bilateral results by indicator category',
      'Reporting status',
      'Centers with reported W3/bilateral results',
      'Progress by area of work'
    ]);
  });

  it('no longer renders the three cards removed on user request', () => {
    const text = fixture.nativeElement.textContent as string;
    // P2-3298 / P2-3300 / P2-3299 respectively.
    expect(text).not.toContain('Reporting pace');
    expect(text).not.toContain('Needs attention');
    expect(text).not.toContain('Impact so far');
    expect(text).not.toContain('Countries reached');
    expect(fixture.nativeElement.querySelectorAll('svg').length).toBe(0);
  });

  it('uses the programme name in the fallback description', () => {
    expect(component.description()).toContain('Breeding for Tomorrow');
  });

  it('sizes each status segment against the total count', () => {
    expect(component.statusTotal()).toBe(7);
    expect(component.segmentWidth(segments[0])).toBeCloseTo((6 / 7) * 100);
  });

  it('never divides by zero when nothing has been reported', () => {
    fixture.componentRef.setInput('statusSegments', [{ key: 'x', label: 'x', count: 0, bg: '', fg: '' }]);
    fixture.detectChanges();
    expect(component.statusTotal()).toBe(0);
    expect(component.segmentWidth(component.statusSegments()[0])).toBe(0);
  });

  it('lists areas of work least complete first when parent sorts that way', () => {
    const percents = component.aowProgress().map(row => component.percentOf(row));
    expect(percents[0]).toBeLessThanOrEqual(percents[1]);
  });

  it('treats an area of work with no planned indicators as 0%', () => {
    expect(component.percentOf({ code: 'AOW09', name: 'Empty', done: 0, total: 0 })).toBe(0);
  });

  describe('results by indicator category', () => {
    it('scales each bar against the largest count in its own series', () => {
      expect(component.categoryWidth(categories[0])).toBe(100);
      expect(component.categoryWidth(categories[1])).toBeCloseTo((10 / 15) * 100);
      expect(component.categoryWidth(categories[6])).toBeCloseTo((1 / 15) * 100);
    });

    /** The old vertical chart capped at 4 columns, which hid half of SP02's categories. */
    it('renders every category, with no four-item cap', () => {
      // Every bar row, singular or plural — the aria-label suffix varies with the count.
      const rows = fixture.nativeElement.querySelectorAll('button[aria-label]');
      expect(categories.length).toBe(8);
      expect(rows.length).toBe(categories.length + bilateralCategories.length + centers.length);
    });

    it('returns 0 instead of NaN for an all-zero series', () => {
      const zeroes: CategoryBar[] = [
        { name: 'A', count: 0, link: null },
        { name: 'B', count: 0, link: null }
      ];
      fixture.componentRef.setInput('categories', zeroes);
      fixture.detectChanges();
      expect(component.categoryWidth(zeroes[0])).toBe(0);
      expect(Number.isNaN(component.categoryWidth(zeroes[0]))).toBe(false);
    });

    it('shows an empty state instead of an empty chart', () => {
      fixture.componentRef.setInput('categories', []);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No result categories reported yet.');
    });

    it('exposes the count to assistive tech and hides the bar itself', () => {
      const row = fixture.nativeElement.querySelector('button[aria-label^="Innovation development"]');
      expect(row.getAttribute('aria-label')).toBe('Innovation development: 15 results');
      expect(row.querySelector('[aria-hidden="true"]')).toBeTruthy();
    });

    it('says "1 result", not "1 results", for a single-result category', () => {
      const singles = fixture.nativeElement.querySelectorAll('button[aria-label$="1 result"]');
      // Two categories sit at count 1 in the fixture (Other outcome, Innovation Packages).
      expect(singles.length).toBe(2);
    });
  });

  describe('bilateral breakdowns', () => {
    it('normalises the bilateral bars against their own maximum, not the own-results one', () => {
      // 70 is the bilateral max even though the own-results series peaks at 15.
      expect(component.bilateralCategoryWidth(bilateralCategories[0])).toBe(100);
      expect(component.bilateralCategoryWidth(bilateralCategories[1])).toBeCloseTo((30 / 70) * 100);
    });

    it('shows an empty state when no bilateral results are linked', () => {
      fixture.componentRef.setInput('bilateralCategories', []);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('No bilateral results are linked to this program yet.');
    });
  });

  describe('centers with reported W3/bilateral results', () => {
    it('calculates center bar width relative to the maximum center count', () => {
      expect(component.bilateralCentersMax()).toBe(45);
      expect(component.centerWidth(centers[0])).toBe(100);
      expect(component.centerWidth(centers[1])).toBeCloseTo((32 / 45) * 100);
      expect(component.centerWidth(centers[2])).toBeCloseTo((4 / 45) * 100);
    });

    it('renders center acronyms, counts, and width styling in the DOM', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('CIAT');
      expect(text).toContain('45');
      expect(text).toContain('IRRI');
      expect(text).toContain('32');
      expect(text).toContain('CIMMYT');
      expect(text).toContain('4');

      const ciatButton = fixture.nativeElement.querySelector('button[aria-label="CIAT: 45 results"]');
      expect(ciatButton).toBeTruthy();
      const ciatBar = ciatButton.querySelector('.bg-\\[var\\(--pr-chart-2\\)\\]');
      expect(ciatBar.style.width).toBe('100%');
    });

    it('says "1 result", not "1 results", for a single-result center', () => {
      fixture.componentRef.setInput('bilateralCenters', [{ name: 'CIP', count: 1 }]);
      fixture.detectChanges();
      const row = fixture.nativeElement.querySelector('button[aria-label="CIP: 1 result"]');
      expect(row).toBeTruthy();
    });

    it('shows an empty state when no centers have reported bilateral results', () => {
      fixture.componentRef.setInput('bilateralCenters', []);
      fixture.detectChanges();
      expect(component.bilateralCentersMax()).toBe(0);
      expect(component.centerWidth({ name: 'CIAT', count: 0 })).toBe(0);
      expect(fixture.nativeElement.textContent).toContain(
        'No centers have reported bilateral results for this program yet.'
      );
    });

    it('does not render legacy bilateral role counts or review stub', () => {
      const text = fixture.nativeElement.textContent as string;
      expect(text).not.toContain('Results where this program is tagged');
      expect(text).not.toContain('Where this program is the primary science program');
      expect(text).not.toContain('Where this program is a contributor');
      expect(text).not.toContain('Of those where this program is primary');
      expect(text).not.toContain('A breakdown by review status is not shown yet.');
    });
  });

  describe('controls with no authorising ticket', () => {
    it('ships the category and center rows visible but disabled', () => {
      const rows: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button[aria-label]'));
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every(row => row.disabled)).toBe(true);
    });

    /** One tag per section, never per row — repeating it would drown the data it annotates. */
    it('announces Coming soon once per affected section', () => {
      const tags = Array.from(fixture.nativeElement.querySelectorAll('span')).filter(
        (s: any) => s.textContent.trim() === 'Coming soon'
      );
      expect(tags.length).toBe(2);
    });
  });

  describe('status meter', () => {
    it('only prints the count inside segments wider than 8% of the bar', () => {
      // 6/7 is wide; 1/7 (14%) is still wide; a 1-in-40 sliver is not.
      expect(component.showsSegmentCount(segments[0])).toBe(true);
      expect(component.showsSegmentCount(segments[2])).toBe(false);

      fixture.componentRef.setInput('statusSegments', [
        { key: 'a', label: 'A', count: 38, bg: '', fg: '', statusName: 'A', link: { status: 'A' } },
        { key: 'b', label: 'B', count: 1, bg: '', fg: '', statusName: 'B', link: { status: 'B' } },
        { key: 'c', label: 'C', count: 1, bg: '', fg: '', statusName: 'C', link: { status: 'C' } }
      ] satisfies StatusSegment[]);
      fixture.detectChanges();

      const narrow = component.statusSegments().slice(1);
      expect(narrow.map(s => component.showsSegmentCount(s))).toEqual([false, false]);
      // Exactly one number inside the meter — the two slivers must not stack their labels.
      // Scoped to the 44px meter: the breakdown bars print counts in the same figure style.
      const printed = fixture.nativeElement.querySelectorAll('div.h-\\[44px\\] > span.pr-figure-sm');
      expect(printed.length).toBe(1);
    });

    it('renders a legend entry for every segment, including zero-count ones', () => {
      // Scoped to the 8px legend dot: the breakdown bars are rounded-full too.
      const legend = fixture.nativeElement.querySelectorAll('span.h-\\[8px\\].w-\\[8px\\].rounded-full');
      expect(legend.length).toBe(segments.length);
    });
  });
});
