import { TestBed } from '@angular/core/testing';
import { PortfolioTypologyBlockComponent } from './typology-block.component';
import { PORTFOLIO_OVERVIEW_COPY } from '../../../../../../internationalization/portfolio-overview.copy';
import type { RawResult } from '../../services/portfolio-overview.service';

const times = (n: number, row: RawResult): RawResult[] => Array.from({ length: n }, () => ({ ...row }));

// 10 rows: Output 5 (4 KP + 1 ID), Outcome 5, Impact 0, none unclassified. 6 are W3 (3 IITA, 2 CIMMYT, 1 no lead).
const baseRows = (): RawResult[] => [
  ...times(4, { submitter: 'SP01', submitter_short_name: 'Climate Action', result_type: 'Knowledge product', source_name: 'W1/W2' }),
  ...times(2, { submitter: 'SP01', result_type: 'Other outcome', source_name: 'W1/W2' }),
  { submitter: 'SP02', submitter_short_name: 'Policy', result_type: 'Innovation development', source_name: 'W3/Bilaterals', lead_center: 'IITA' },
  ...times(2, { submitter: 'SP02', result_type: 'Policy change', source_name: 'W3/Bilaterals', lead_center: 'IITA' }),
  { submitter: 'SP02', result_type: 'Innovation use', source_name: 'W3/Bilaterals', lead_center: 'CIMMYT' }
];

describe('PortfolioTypologyBlockComponent (TYV-T-2)', () => {
  const copy = PORTFOLIO_OVERVIEW_COPY;

  function create(rows: RawResult[] = baseRows()) {
    TestBed.configureTestingModule({ imports: [PortfolioTypologyBlockComponent] });
    const fixture = TestBed.createComponent(PortfolioTypologyBlockComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();
    return fixture;
  }

  const el = (fixture: ReturnType<typeof create>): HTMLElement => fixture.nativeElement;
  const q = (fixture: ReturnType<typeof create>, selector: string) => el(fixture).querySelector(selector) as HTMLElement | null;
  const qa = (fixture: ReturnType<typeof create>, selector: string) => Array.from(el(fixture).querySelectorAll(selector)) as HTMLElement[];
  const cardTexts = (fixture: ReturnType<typeof create>) => qa(fixture, '[data-testid^="typology-card-"][data-testid$="put"],[data-testid="typology-cards"] > div').map(c => c.textContent!.replace(/\s+/g, ' ').trim());
  const clickTab = (fixture: ReturnType<typeof create>, dim: 'program' | 'center') => {
    q(fixture, `[data-testid="typology-tab-${dim}"]`)!.click();
    fixture.detectChanges();
  };

  afterEach(() => TestBed.resetTestingModule());

  it('S-2.1 shows count, percent and the type list (highest first) of a level card', () => {
    const fixture = create();
    const output = q(fixture, '[data-testid="typology-card-output"]')!;
    expect(output.querySelector('[data-testid="typology-card-count"]')!.textContent!.trim()).toBe('5');
    expect(output.querySelector('[data-testid="typology-card-percent"]')!.textContent!.trim()).toBe('50%');
    const items = Array.from(output.querySelectorAll('li')).map(li => Array.from(li.querySelectorAll('span')).map(s => s.textContent!.trim()).join(' '));
    expect(items).toEqual(['Knowledge product 4', 'Innovation development 1']);
  });

  it('S-2.2 an empty level still renders, at 0 and 0%, with the muted line', () => {
    const fixture = create();
    const impact = q(fixture, '[data-testid="typology-card-impact"]')!;
    expect(impact.querySelector('[data-testid="typology-card-count"]')!.textContent!.trim()).toBe('0');
    expect(impact.querySelector('[data-testid="typology-card-percent"]')!.textContent!.trim()).toBe('0%');
    expect(impact.querySelector('[data-testid="typology-card-empty"]')!.textContent!.trim()).toBe(copy.levelEmpty);
  });

  it('shows the Unclassified card and column only when a row is unclassified', () => {
    const none = create();
    expect(q(none, '[data-testid="typology-card-unclassified"]')).toBeNull();
    expect(qa(none, 'thead th').map(th => th.textContent!.trim())).not.toContain(copy.levelUnclassified);
    TestBed.resetTestingModule();

    const one = create([...baseRows(), { submitter: 'SP01', result_type: 'Something else', source_name: 'W1/W2' }]);
    expect(q(one, '[data-testid="typology-card-unclassified"]')).not.toBeNull();
    expect(qa(one, 'thead th').map(th => th.textContent!.trim())).toContain(copy.levelUnclassified);
  });

  it('TYV-R-4/R-5 the Unclassified column is page-wide: a W1/W2-only unclassified row still adds it to the By Center table', () => {
    const fixture = create([...baseRows(), { submitter: 'SP01', result_type: 'Something else', source_name: 'W1/W2' }]);
    expect(qa(fixture, 'thead th').map(th => th.textContent!.trim())).toContain(copy.levelUnclassified);
    clickTab(fixture, 'center');
    expect(qa(fixture, 'thead th').map(th => th.textContent!.trim())).toContain(copy.levelUnclassified);
  });

  it('takes the "no type" and catch-all labels from the copy, not from the aggregate', () => {
    const fixture = create([{ submitter: 'SP01', result_type: 'Knowledge product' }, { result_type: '' }]);
    expect(q(fixture, '[data-testid="typology-card-unclassified"]')!.textContent).toContain(copy.noType);
    const labels = qa(fixture, '[data-testid="typology-row"] th').map(th => th.textContent!.trim());
    expect(labels).toEqual(['SP01', copy.noProgram]);
  });

  it('defaults to the Program dimension, ordered by code, rows reconcile to the page', () => {
    const fixture = create();
    const labels = qa(fixture, '[data-testid="typology-row"] th').map(th => th.textContent!.replace(/\s+/g, ' ').trim());
    expect(labels).toEqual(['SP01 Climate Action', 'SP02 Policy']);
    const totals = qa(fixture, '[data-testid="typology-row-total"]').map(td => td.textContent!.trim());
    expect(totals).toEqual(['6', '4']);
  });

  it('S-3.1 switching to Center regroups the table but the card texts are identical', () => {
    const fixture = create();
    const before = qa(fixture, '[data-testid="typology-cards"] > div').map(c => c.textContent!.replace(/\s+/g, ' ').trim());
    clickTab(fixture, 'center');
    expect(fixture.componentInstance.dimension()).toBe('center');
    const labels = qa(fixture, '[data-testid="typology-row"] th').map(th => th.textContent!.trim());
    expect(labels).toEqual(['CIMMYT', 'IITA']);
    const after = qa(fixture, '[data-testid="typology-cards"] > div').map(c => c.textContent!.replace(/\s+/g, ' ').trim());
    expect(after).toEqual(before);
    expect(before.length).toBe(3);
  });

  it('S-5.1 the Center dimension counts W3/Bilateral rows only and the lead-less row goes last', () => {
    const fixture = create([...baseRows(), { submitter: 'SP02', result_type: 'Policy change', source_name: 'W3/Bilaterals' }]);
    clickTab(fixture, 'center');
    const totals = qa(fixture, '[data-testid="typology-row"]').map(r => r.textContent!.replace(/\s+/g, ' ').trim());
    expect(totals.length).toBe(3);
    expect(totals[2]).toContain(copy.noLeadCenter);
  });

  it('S-5.2 with 0 W3 rows the Center dimension shows the empty state and the cards keep their values', () => {
    const rows = times(4, { submitter: 'SP01', result_type: 'Knowledge product', source_name: 'W1/W2' });
    const fixture = create(rows);
    const before = qa(fixture, '[data-testid="typology-cards"] > div').map(c => c.textContent!.replace(/\s+/g, ' ').trim());
    expect(q(fixture, '[data-testid="typology-center-empty"]')).toBeNull();
    clickTab(fixture, 'center');
    expect(q(fixture, '[data-testid="typology-center-empty"]')!.textContent!.trim()).toBe(copy.centerEmpty);
    expect(q(fixture, '[data-testid="typology-table"]')).toBeNull();
    const after = qa(fixture, '[data-testid="typology-cards"] > div').map(c => c.textContent!.replace(/\s+/g, ' ').trim());
    expect(after).toEqual(before);
    expect(cardTexts(fixture).length).toBeGreaterThan(0);
  });

  it('shows the center note only in the center dimension', () => {
    const fixture = create();
    expect(q(fixture, '[data-testid="typology-center-note"]')).toBeNull();
    clickTab(fixture, 'center');
    expect(q(fixture, '[data-testid="typology-center-note"]')!.textContent!.trim()).toBe(copy.centerNote);
    clickTab(fixture, 'program');
    expect(q(fixture, '[data-testid="typology-center-note"]')).toBeNull();
  });

  it('TYV-R-3 the two tab triggers announce the selection with aria-selected (presence only)', () => {
    const fixture = create();
    const program = q(fixture, '[data-testid="typology-tab-program"]')!;
    const center = q(fixture, '[data-testid="typology-tab-center"]')!;
    expect(program.hasAttribute('aria-selected')).toBe(true);
    expect(center.hasAttribute('aria-selected')).toBe(true);
    expect(program.getAttribute('aria-selected')).toBe('true');
    expect(center.getAttribute('aria-selected')).toBe('false');
    clickTab(fixture, 'center');
    expect(program.getAttribute('aria-selected')).toBe('false');
    expect(center.getAttribute('aria-selected')).toBe('true');
  });

  it('S-6.1 the bar is aria-hidden, renders no segment at 0 and every segment carries min-w-[4px]', () => {
    const rows = [...times(199, { submitter: 'SP01', result_type: 'Knowledge product' }), { submitter: 'SP01', result_type: 'Impact contribution' }];
    const fixture = create(rows);
    const bar = q(fixture, '[data-testid="typology-bar"]')!;
    expect(bar.getAttribute('aria-hidden')).toBe('true');
    expect(bar.querySelector('[data-testid="typology-segment-outcome"]')).toBeNull();
    expect(bar.querySelector('[data-testid="typology-segment-unclassified"]')).toBeNull();
    const segments = Array.from(bar.children) as HTMLElement[];
    expect(segments.map(s => s.getAttribute('data-testid'))).toEqual(['typology-segment-output', 'typology-segment-impact']);
    segments.forEach(s => expect(s.classList.contains('min-w-[4px]')).toBe(true));
    expect(segments.map(s => s.style.flexGrow)).toEqual(['199', '1']);
  });

  it('fills come from tokens only: no hex anywhere in the markup', () => {
    const fixture = create([...baseRows(), { submitter: 'SP01', result_type: 'Something else' }]);
    const html = el(fixture).innerHTML;
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // jsdom drops var() backgrounds from the style attribute, so the token mapping is asserted at its source.
    const c = fixture.componentInstance;
    expect([c.fill('output'), c.fill('outcome'), c.fill('impact')]).toEqual(['var(--pr-color-result-level-2)', 'var(--pr-color-result-level-4)', 'var(--pr-color-result-level-3)']);
    expect(c.fill('unclassified')).toMatch(/^var\(--pr-color-neutral-\d+\)$/);
  });

  it('S-4.2 headers are plain: no button, no aria-sort', () => {
    const fixture = create();
    expect(qa(fixture, 'thead button').length).toBe(0);
    expect(qa(fixture, 'thead [aria-sort]').length).toBe(0);
  });

  it('TYV-R-8 no link or button inside the cards or the table rows', () => {
    const fixture = create();
    clickTab(fixture, 'center');
    for (const scope of ['[data-testid="typology-cards"]', '[data-testid="typology-table"]']) {
      const root = q(fixture, scope)!;
      expect(root.querySelectorAll('a, button, [role="link"], [role="button"]').length).toBe(0);
    }
  });

  it('below 640px the tab list fills the card and the labels wrap (class presence only; width is measured live)', () => {
    const fixture = create();
    const list = q(fixture, 'hlm-tabs-list')!;
    expect(list.classList.contains('max-sm:!w-full')).toBe(true);
    expect(list.classList.contains('max-sm:!h-auto')).toBe(true);
    for (const dim of ['program', 'center'] as const) {
      const trigger = q(fixture, `[data-testid="typology-tab-${dim}"]`)!;
      expect(trigger.classList.contains('max-sm:!whitespace-normal')).toBe(true);
      expect(trigger.classList.contains('max-sm:min-w-0')).toBe(true);
    }
  });

  it('the table has a caption', () => {
    const fixture = create();
    expect(q(fixture, 'table caption')!.textContent!.trim()).toBe(copy.typologyTableCaption);
  });
});
