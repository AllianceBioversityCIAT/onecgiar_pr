// @akili-spec changes/portfolio-rejection-reason-export (PRE-T-3, PRE-R-1, R-3, R-6)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioDetailFiltersComponent } from './detail-filters.component';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';

const copy = PORTFOLIO_OVERVIEW_COPY.detail.filters;

const FUNDING = [
  { value: 'w1w2', label: 'W1/W2' },
  { value: 'bilateral', label: 'W3/Bilateral' }
];
const STATUS = [
  { value: 'editing', label: 'Editing' },
  { value: 'in-qa', label: 'Quality Assessed' },
  { value: 'rejected', label: 'Rejected' }
];

describe('PortfolioDetailFiltersComponent (PRE-T-3)', () => {
  let fixture: ComponentFixture<PortfolioDetailFiltersComponent>;
  const root = (): HTMLElement => fixture.nativeElement;
  const q = <T extends HTMLElement>(sel: string) => root().querySelector<T>(sel);
  const trigger = () => q<HTMLButtonElement>('[data-testid="detail-filters-trigger"]')!;

  function create(inputs: Record<string, unknown> = {}) {
    fixture = TestBed.createComponent(PortfolioDetailFiltersComponent);
    fixture.componentRef.setInput('fundingOptions', FUNDING);
    fixture.componentRef.setInput('statusOptions', STATUS);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
  }
  const open = () => {
    trigger().click();
    fixture.detectChanges();
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [PortfolioDetailFiltersComponent] }));

  it('renders exactly the Funding and Status sections from the inputs, nothing else (PRE-R-1 BUT no Program/Project/Center/Typology)', () => {
    create();
    open();
    const groups = Array.from(root().querySelectorAll('[brnCommandGroup]'));
    expect(groups.map(g => g.getAttribute('aria-label'))).toEqual([copy.funding, copy.status]);
    expect(root().querySelectorAll('[data-testid^="detail-filter-item-funding-"]')).toHaveLength(2);
    expect(root().querySelectorAll('[data-testid^="detail-filter-item-status-"]')).toHaveLength(3);
    expect(root().querySelectorAll('[data-testid^="detail-filter-item-"]')).toHaveLength(5);
    expect(root().textContent).not.toMatch(/Program|Project|Center|Typology/);
  });

  it('marks the selected values as checked (PRE-R-1 open and read state)', () => {
    create({ statusSelected: new Set(['rejected']) });
    open();
    expect(q('[data-testid="detail-filter-item-status-rejected"]')!.getAttribute('aria-checked')).toBe('true');
    expect(q('[data-testid="detail-filter-item-status-editing"]')!.getAttribute('aria-checked')).toBe('false');
    expect(q('[data-testid="detail-filter-item-funding-w1w2"]')!.getAttribute('aria-checked')).toBe('false');
    expect(q('[data-testid="detail-filter-item-funding-bilateral"]')!.getAttribute('aria-checked')).toBe('false');
  });

  it('emits { dimension, value } when an item is toggled', () => {
    create();
    open();
    const emitted: { dimension: string; value: string }[] = [];
    fixture.componentInstance.toggled.subscribe(e => emitted.push(e));
    q('[data-testid="detail-filter-item-funding-bilateral"]')!.dispatchEvent(new CustomEvent('selected'));
    q('[data-testid="detail-filter-item-status-rejected"]')!.dispatchEvent(new CustomEvent('selected'));
    expect(emitted).toEqual([
      { dimension: 'funding', value: 'bilateral' },
      { dimension: 'status', value: 'rejected' }
    ]);
  });

  it('count badge equals funding + status size and the accessible name includes it (PRE-R-1, R-6)', () => {
    create({ fundingSelected: new Set(['bilateral']), statusSelected: new Set(['rejected', 'editing']) });
    expect(q('[data-testid="detail-filters-count"]')!.textContent!.trim()).toBe('3');
    expect(trigger().getAttribute('aria-label')).toBe('Filters, 3 selected');
  });

  it('shows no count and the plain name when nothing is selected (PRE-R-1 no active values)', () => {
    create();
    expect(q('[data-testid="detail-filters-count"]')).toBeNull();
    expect(trigger().getAttribute('aria-label')).toBe('Filters');
    expect(trigger().textContent).toContain('Filters');
  });

  it('Clear emits cleared and is disabled when both sets are empty (PRE-R-3)', () => {
    create({ statusSelected: new Set(['rejected']) });
    open();
    let cleared = 0;
    fixture.componentInstance.cleared.subscribe(() => cleared++);
    const clear = q<HTMLButtonElement>('[data-testid="detail-filters-clear"]')!;
    expect(clear.disabled).toBe(false);
    clear.click();
    expect(cleared).toBe(1);

    fixture.componentRef.setInput('statusSelected', new Set<string>());
    fixture.detectChanges();
    expect(q<HTMLButtonElement>('[data-testid="detail-filters-clear"]')!.disabled).toBe(true);
  });

  it('shows the hint line that the filters also filter the whole page (PRE-R-4)', () => {
    create();
    open();
    expect(q('[data-testid="detail-filters-hint"]')!.textContent).toContain(copy.hint);
  });

  it('exposes listbox popup semantics on the trigger and tracks aria-expanded / aria-controls (PRE-R-6)', () => {
    create();
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().hasAttribute('aria-controls')).toBe(false);
    open();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe('pr-detail-filters-list');
  });

  it('PRE-R-1: the trigger and Clear are real Helm buttons (same look as Export), not bare buttons', () => {
    create();
    open();
    expect(trigger().getAttribute('data-slot')).toBe('button');
    const clear = q<HTMLButtonElement>('[data-testid="detail-filters-clear"]')!;
    expect(clear.getAttribute('data-slot')).toBe('button');
  });

  it('disabled blocks opening (PRE-R-5)', () => {
    create({ disabled: true });
    expect(trigger().disabled).toBe(true);
    trigger().click();
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape closes the panel and focus returns to the trigger (PRE-R-6)', () => {
    create();
    document.body.appendChild(root());
    trigger().focus();
    open();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const list = q('[data-testid="detail-filter-item-funding-w1w2"]')!;
    list.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger());
    root().remove();
  });
});
