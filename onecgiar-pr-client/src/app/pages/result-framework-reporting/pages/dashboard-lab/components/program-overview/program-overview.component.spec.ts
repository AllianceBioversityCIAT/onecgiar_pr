import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgramOverviewComponent, StatusSegment } from './program-overview.component';

describe('ProgramOverviewComponent', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;
  let component: ProgramOverviewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programName', 'Breeding for Tomorrow');
    fixture.detectChanges();
  });

  it('renders the seven Overview blocks', () => {
    const headings = Array.from(fixture.nativeElement.querySelectorAll('h2')).map((h: any) => h.textContent.trim());

    expect(headings).toEqual([
      'About this program',
      'Reporting status',
      'Reporting pace',
      'Progress by area of work',
      'Needs attention',
      'Largest gaps to target',
      'Impact so far'
    ]);
  });

  it('opens the description with the programme name and toggles the clamp', () => {
    expect(component.description()).toContain('Breeding for Tomorrow');

    const paragraph = () => fixture.nativeElement.querySelector('p');
    expect(paragraph().classList).toContain('pr-overview-clamp-3');

    component.descriptionExpanded.set(true);
    fixture.detectChanges();

    expect(paragraph().classList).not.toContain('pr-overview-clamp-3');
  });

  it('sizes each status segment against the total count', () => {
    expect(component.statusTotal()).toBe(28);

    const [notStarted] = component.statusSegments();
    expect(component.segmentWidth(notStarted)).toBeCloseTo((20 / 28) * 100);
  });

  it('never divides by zero when nothing has been reported', () => {
    const empty: StatusSegment = { key: 'x', label: 'x', count: 0, bg: '', fg: '' };
    component.statusSegments.set([empty]);

    expect(component.statusTotal()).toBe(0);
    expect(component.segmentWidth(empty)).toBe(0);
  });

  it('drops zero-count segments from the meter but keeps them in the legend', () => {
    // `Approved 0` must still be listed — a status at zero is information, an empty bar is noise.
    const meterSegments = fixture.nativeElement.querySelectorAll('[title]');
    const legendRows = fixture.nativeElement.querySelectorAll('.pr-figure-sm');

    expect(meterSegments.length).toBe(4);
    expect(Array.from(legendRows).some((n: any) => n.textContent.trim() === '0')).toBe(true);
  });

  it('lists areas of work least complete first', () => {
    const percents = component.aowProgress().map(row => component.percentOf(row));

    expect(percents).toEqual([...percents].sort((a, b) => a - b));
    expect(percents[0]).toBe(0);
  });

  it('scales the country bars and the category bars against their own maximum', () => {
    const [kenya, , ethiopia] = component.countries();
    expect(component.countryWidth(kenya)).toBe(100);
    expect(component.countryWidth(ethiopia)).toBeCloseTo((7 / 8) * 100);

    const [knowledgeProduct, , capacitySharing] = component.categories();
    expect(component.categoryHeight(knowledgeProduct)).toBe(130);
    expect(component.categoryHeight(capacitySharing)).toBe(Math.round((3 / 11) * 130));
  });

  it('treats an area of work with no planned indicators as 0%, not NaN', () => {
    expect(component.percentOf({ code: 'AOW09', name: 'Empty', done: 0, total: 0 })).toBe(0);
  });
});
