import { By } from '@angular/platform-browser';
import { BrnPopover } from '@spartan-ng/brain/popover';
import { HlmPopover } from '@spartan/popover';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FilterMultiSelectComponent } from './filter-multi-select.component';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import type { TypologyOptionGroup } from '../../services/portfolio-filters';

const typologyGroups: TypologyOptionGroup[] = [
  { level: 'output', value: 'output', label: 'Output', types: [{ value: 'innovation development', label: 'Innovation development' }] },
  { level: 'outcome', value: 'outcome', label: 'Outcome', types: [{ value: 'policy change', label: 'Policy change' }] }
];

describe('FilterMultiSelectComponent (GLF-T-4)', () => {
  let fixture: ComponentFixture<FilterMultiSelectComponent>;
  const root = (): HTMLElement => fixture.nativeElement;
  const q = <T extends HTMLElement>(sel: string) => root().querySelector<T>(sel);

  function create(inputs: Record<string, unknown>) {
    fixture = TestBed.createComponent(FilterMultiSelectComponent);
    fixture.componentRef.setInput('dimension', 'program');
    fixture.componentRef.setInput('label', 'Program');
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [FilterMultiSelectComponent] }));

  it('exposes listbox semantics on the trigger and tracks expanded state', () => {
    create({ options: [{ value: 'SP01', label: 'SP01' }] });
    const trigger = q<HTMLButtonElement>('[data-testid="filter-trigger-program"]')!;
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('renders the items once the popover opens (structural Brain directives resolve their TemplateRef)', () => {
    create({ options: [{ value: 'SP01', label: 'SP01' }] });
    q<HTMLButtonElement>('[data-testid="filter-trigger-program"]')!.click();
    fixture.detectChanges();
    expect(q('[data-testid="filter-item-program-SP01"]')).not.toBeNull();
    expect(root().textContent).not.toContain(PORTFOLIO_OVERVIEW_COPY.filters.noMatches);
  });

  it('renders the empty-state text, and only then, when no item is listed', () => {
    create({ options: [] });
    q<HTMLButtonElement>('[data-testid="filter-trigger-program"]')!.click();
    fixture.detectChanges();
    expect(root().textContent).toContain(PORTFOLIO_OVERVIEW_COPY.filters.noMatches);
  });

  it('anchors the popover to its trigger through attachTo', () => {
    create({ options: [{ value: 'SP01', label: 'SP01' }] });
    const popover = fixture.debugElement.query(By.directive(HlmPopover)).injector.get(BrnPopover);
    expect(popover.attachTo).toBe(q('[data-testid="filter-trigger-program"]'));
  });

  it('binds aria-controls on the trigger only while open', () => {
    create({ options: [{ value: 'SP01', label: 'SP01' }] });
    const trigger = q<HTMLButtonElement>('[data-testid="filter-trigger-program"]')!;
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-controls')).toBe('pr-filter-list-program');
  });

  it('marks selected items with aria-checked and shows the count on the trigger', () => {
    create({
      options: [
        { value: 'SP01', label: 'SP01' },
        { value: 'SP02', label: 'SP02' }
      ],
      selected: new Set(['SP02'])
    });
    expect(q('[data-testid="filter-item-program-SP02"]')!.getAttribute('aria-checked')).toBe('true');
    expect(q('[data-testid="filter-item-program-SP01"]')!.getAttribute('aria-checked')).toBe('false');
    expect(q('[data-testid="filter-trigger-count"]')!.textContent!.trim()).toBe('1');
    expect(q('[data-testid="filter-trigger-program"]')!.getAttribute('aria-label')).toBe('Program, 1 selected');
  });

  it('emits the value when an item is selected', () => {
    create({ options: [{ value: 'SP01', label: 'SP01' }] });
    const emitted: string[] = [];
    fixture.componentInstance.toggled.subscribe(v => emitted.push(v));
    q('[data-testid="filter-item-program-SP01"]')!.dispatchEvent(new CustomEvent('selected'));
    expect(emitted).toEqual(['SP01']);
  });

  it('renders level groups with a select-level item that carries the level token', () => {
    create({ dimension: 'typology', label: 'Typology', groups: typologyGroups });
    const emitted: string[] = [];
    fixture.componentInstance.toggled.subscribe(v => emitted.push(v));
    const outcomeAll = q('[data-testid="filter-item-typology-outcome"]')!;
    expect(outcomeAll.textContent).toContain('All Outcome types');
    outcomeAll.dispatchEvent(new CustomEvent('selected'));
    expect(emitted).toEqual(['outcome']);
    expect(q('[data-testid="filter-item-typology-policy change"]')).not.toBeNull();
  });

  it('disables the trigger, hides the open state and describes why when disabled', () => {
    create({ dimension: 'project', label: 'Project', disabled: true, hint: 'Unavailable right now. Use Retry.' });
    const trigger = q<HTMLButtonElement>('[data-testid="filter-trigger-project"]')!;
    expect(trigger.disabled).toBe(true);
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    const describedBy = trigger.getAttribute('aria-describedby')!;
    expect(root().querySelector(`#${describedBy}`)!.textContent).toContain('Use Retry');
  });

  it('keeps the search input reachable and only shows it when searchable', () => {
    create({ dimension: 'center', label: 'Center', searchable: true, options: [{ value: 'CENTER-03', label: 'CIAT' }] });
    const input = q<HTMLInputElement>('[data-testid="filter-search-center"]')!;
    expect(input.placeholder).toBe('Search center');
    expect(input.parentElement!.classList.contains('sr-only')).toBe(false);

    create({ options: [{ value: 'SP01', label: 'SP01' }] });
    expect(q('[data-testid="filter-search-program"]')!.parentElement!.classList.contains('sr-only')).toBe(true);
  });
});
