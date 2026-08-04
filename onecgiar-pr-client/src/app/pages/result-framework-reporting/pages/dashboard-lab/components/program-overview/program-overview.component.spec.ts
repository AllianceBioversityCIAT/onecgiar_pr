import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ProgramOverviewComponent,
  StatusSegment,
  AowProgressRow,
  CategoryBar,
  CountryRow
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
});
