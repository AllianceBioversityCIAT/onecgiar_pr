import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY_SELECTION, type PortfolioFilterOptions, type PortfolioFilterSelection } from '../../services/portfolio-filters';
import { PortfolioOverviewService } from '../../services/portfolio-overview.service';
import { FilterBarComponent } from './filter-bar.component';

const OPTIONS: PortfolioFilterOptions = {
  program: [
    { value: 'SP01', label: 'SP01 — Breeding' },
    { value: 'SP02', label: 'SP02 — Farming' }
  ],
  project: [{ value: '11', label: 'Project Eleven' }],
  center: [
    { value: 'CENTER-03', label: 'CIAT' },
    { value: 'CENTER-07', label: 'IITA' }
  ],
  typology: [
    { level: 'output', value: 'output', label: 'Output', types: [{ value: 'innovation development', label: 'Innovation development' }] },
    { level: 'outcome', value: 'outcome', label: 'Outcome', types: [{ value: 'policy change', label: 'Policy change' }] }
  ],
  status: [{ value: 'approved', label: 'Approved' }]
};

type MapStatus = 'idle' | 'loading' | 'ready' | 'error';

function makeStub() {
  return {
    selection: signal<PortfolioFilterSelection>(EMPTY_SELECTION),
    options: signal<PortfolioFilterOptions>(OPTIONS),
    dimensions: signal<{ status: MapStatus; map: null }>({ status: 'ready', map: null }),
    dimensionsNotice: signal(false),
    filtersPending: signal(false),
    filteredTotal: signal(6094),
    total: signal(6094),
    toggleValue: jest.fn(),
    clearAll: jest.fn(),
    clearDimension: jest.fn(),
    retryDimensions: jest.fn()
  };
}

describe('FilterBarComponent (GLF-T-4)', () => {
  let fixture: ComponentFixture<FilterBarComponent>;
  let stub: ReturnType<typeof makeStub>;
  const root = (): HTMLElement => fixture.nativeElement;
  const q = <T extends HTMLElement>(sel: string) => root().querySelector<T>(sel);
  const select = (partial: Partial<Record<keyof PortfolioFilterSelection, string[]>>) =>
    stub.selection.set({ ...EMPTY_SELECTION, ...Object.fromEntries(Object.entries(partial).map(([k, v]) => [k, new Set(v)])) } as PortfolioFilterSelection);

  beforeEach(() => {
    stub = makeStub();
    TestBed.configureTestingModule({ imports: [FilterBarComponent], providers: [{ provide: PortfolioOverviewService, useValue: stub }] });
    fixture = TestBed.createComponent(FilterBarComponent);
    fixture.detectChanges();
  });

  it('renders the five controls in bar order', () => {
    const order = [...root().querySelectorAll('[data-testid^="filter-trigger-"]:not([data-testid="filter-trigger-count"])')].map(el => el.getAttribute('data-testid'));
    expect(order).toEqual(['filter-trigger-program', 'filter-trigger-project', 'filter-trigger-center', 'filter-trigger-typology', 'filter-trigger-status']);
  });

  it('with nothing selected: no chips, no Clear all, and the plain count', () => {
    expect(q('[data-testid="filter-clear-all"]')).toBeNull();
    expect(q('[data-testid="filter-chips"]')).toBeNull();
    expect(q('[data-testid="filter-count"]')!.textContent!.trim()).toBe('6,094 results');
  });

  it('center = CENTER-03 with 1,284 of 6,094: CIAT chip, count text and the Remove CIAT button', () => {
    select({ center: ['CENTER-03'] });
    stub.filteredTotal.set(1284);
    fixture.detectChanges();
    const chip = q('[data-testid="filter-chip-center-CENTER-03"]')!;
    expect(chip.textContent).toContain('CIAT');
    expect(chip.querySelector('button')!.getAttribute('aria-label')).toBe('Remove CIAT');
    expect(q('[data-testid="filter-count"]')!.textContent!.trim()).toBe('1,284 of 6,094 results');
    expect(q('[data-testid="filter-clear-all"]')).not.toBeNull();
  });

  it('keeps the count in a polite live region', () => {
    expect(q('[data-testid="filter-count"]')!.getAttribute('aria-live')).toBe('polite');
  });

  it('removing a chip toggles that value, and Clear all calls clearAll', () => {
    select({ center: ['CENTER-03'] });
    fixture.detectChanges();
    q<HTMLButtonElement>('[data-testid="filter-chip-center-CENTER-03"] button')!.click();
    expect(stub.toggleValue).toHaveBeenCalledWith('center', 'CENTER-03');
    q<HTMLButtonElement>('[data-testid="filter-clear-all"]')!.click();
    expect(stub.clearAll).toHaveBeenCalledTimes(1);
  });

  it('with the map in error: Project and Center disabled, Program enabled, Retry calls retryDimensions once', () => {
    stub.dimensions.set({ status: 'error', map: null });
    fixture.detectChanges();
    expect(q<HTMLButtonElement>('[data-testid="filter-trigger-project"]')!.disabled).toBe(true);
    expect(q<HTMLButtonElement>('[data-testid="filter-trigger-center"]')!.disabled).toBe(true);
    expect(q<HTMLButtonElement>('[data-testid="filter-trigger-program"]')!.disabled).toBe(false);
    expect(q<HTMLButtonElement>('[data-testid="filter-trigger-typology"]')!.disabled).toBe(false);
    expect(q<HTMLButtonElement>('[data-testid="filter-trigger-status"]')!.disabled).toBe(false);
    q<HTMLButtonElement>('[data-testid="filter-map-retry"]')!.click();
    expect(stub.retryDimensions).toHaveBeenCalledTimes(1);
  });

  it('with the map loading: Project and Center disabled and a loading line, no Retry', () => {
    stub.dimensions.set({ status: 'loading', map: null });
    fixture.detectChanges();
    expect(q<HTMLButtonElement>('[data-testid="filter-trigger-project"]')!.disabled).toBe(true);
    expect(q('[data-testid="filter-map-loading"]')).not.toBeNull();
    expect(q('[data-testid="filter-map-retry"]')).toBeNull();
  });

  it('with the map ready: all five enabled and no map line', () => {
    for (const d of ['program', 'project', 'center', 'typology', 'status']) {
      expect(q<HTMLButtonElement>(`[data-testid="filter-trigger-${d}"]`)!.disabled).toBe(false);
    }
    expect(q('[data-testid="filter-map-loading"]')).toBeNull();
    expect(q('[data-testid="filter-map-error"]')).toBeNull();
  });

  it('selecting the Outcome group item adds the outcome token', () => {
    q('[data-testid="filter-item-typology-outcome"]')!.dispatchEvent(new CustomEvent('selected'));
    expect(stub.toggleValue).toHaveBeenCalledWith('typology', 'outcome');
  });

  it('shows the dropped-selection notice only when flagged', () => {
    expect(q('[data-testid="filter-dropped-notice"]')).toBeNull();
    stub.dimensionsNotice.set(true);
    fixture.detectChanges();
    expect(q('[data-testid="filter-dropped-notice"]')).not.toBeNull();
  });

  it('shows Applying filters while the map is pending a Project or Center selection', () => {
    select({ project: ['11'] });
    stub.filtersPending.set(true);
    fixture.detectChanges();
    expect(q('[data-testid="filter-count"]')!.textContent!.trim()).toBe('Applying filters…');
  });

  it('the Filters (n) sheet trigger counts selected values and opens the sheet with the same five controls', () => {
    select({ program: ['SP01', 'SP02'], center: ['CENTER-03'] });
    fixture.detectChanges();
    const trigger = q<HTMLButtonElement>('[data-testid="filter-sheet-trigger"]')!;
    expect(trigger.textContent).toContain('Filters (3)');
    expect(q('[data-testid="filter-sheet"]')).toBeNull();
    trigger.click();
    fixture.detectChanges();
    const sheet = q('[data-testid="filter-sheet"]')!;
    expect(sheet).not.toBeNull();
    expect(sheet.querySelectorAll('app-filter-multi-select').length).toBe(5);
  });
});
