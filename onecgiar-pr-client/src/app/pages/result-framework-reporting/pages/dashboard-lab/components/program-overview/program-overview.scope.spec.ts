// @akili-spec changes/overview-aow-cross-filter — OSF-T-6: the scope control (Spartan popover + a
// hand-rolled ARIA 1.2 listbox). Split from `program-overview.component.spec.ts`, same precedent as
// `program-overview.oah-hero.spec.ts` for the previous spec.
//
// `BrnPopoverContent` is stubbed (`tests/mocks/spartanBrainMock.ts`) to render its template INLINE
// — there is no real CDK overlay under Jest, so positioning, outside-click/backdrop dismiss and the
// browser's OWN focus-trap are NOT covered here (`OSF-T-8`, browser-verified only). What IS covered,
// because it is this component's OWN code and not Brain's: the grouped render order, that headers
// never enter the keyboard order, arrow-key movement (including the group-boundary case), Enter/
// Escape, and the emitted `scopeChange`.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProgramOverviewComponent, HeatmapModel, TocAchievement, overviewScopeDisplayCode } from './program-overview.component';
import type { OverviewScopeOption, OverviewScopeBreakdown, OverviewAowProgressRowRich } from '../../dashboard-lab.component';

// `OSF-T-14` — the single-homed short-code mapping, unit-tested directly (both call sites —
// the breakdown row and `scopeTriggerCode()` — are covered through the component further below).
describe('overviewScopeDisplayCode (OSF-T-14, single-homed)', () => {
  it('maps the internal enum keys to the mockup\'s own short display codes', () => {
    expect(overviewScopeDisplayCode({ key: 'INTERMEDIATE', kind: 'outcome' })).toBe('INT');
    expect(overviewScopeDisplayCode({ key: 'EOI_2030', kind: 'outcome' })).toBe('2030');
    expect(overviewScopeDisplayCode({ key: 'UNTAGGED', kind: 'untagged' })).toBe('—');
  });

  it('AoW codes pass through unchanged — already user-facing (AOW01...)', () => {
    expect(overviewScopeDisplayCode({ key: 'AOW01', kind: 'aow' })).toBe('AOW01');
    expect(overviewScopeDisplayCode({ key: 'AOW05', kind: 'aow' })).toBe('AOW05');
  });
});

const mockChartInstance = {
  setOption: jest.fn(),
  resize: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  isDisposed: jest.fn(() => false),
  on: jest.fn()
};

jest.mock('echarts/core', () => ({
  use: jest.fn(),
  init: jest.fn(() => mockChartInstance)
}));

jest.mock('echarts/charts', () => ({
  BarChart: class BarChart {},
  PieChart: class PieChart {},
  HeatmapChart: class HeatmapChart {}
}));

jest.mock('echarts/components', () => ({
  TitleComponent: class TitleComponent {},
  TooltipComponent: class TooltipComponent {},
  GridComponent: class GridComponent {},
  DatasetComponent: class DatasetComponent {},
  LegendComponent: class LegendComponent {},
  VisualMapComponent: class VisualMapComponent {}
}));

jest.mock('echarts/renderers', () => ({
  SVGRenderer: class SVGRenderer {}
}));

jest.mock('echarts/features', () => ({
  UniversalTransition: class UniversalTransition {}
}));

describe('ProgramOverviewComponent — scope control (OSF-T-6)', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;
  let component: ProgramOverviewComponent;

  // Deliberately NOT in AoW/outcome/untagged source order — the render/keyboard order must come
  // from the component's own grouping, not from array order (`OSF-AC-2`).
  const options: OverviewScopeOption[] = [
    { key: 'UNTAGGED', kind: 'untagged', name: 'Not tagged to a ToC area', count: 12 },
    { key: 'AOW02', kind: 'aow', name: 'Accelerated Breeding', count: 4 },
    { key: 'EOI_2030', kind: 'outcome', name: '2030 outcomes', count: 3 },
    { key: 'AOW01', kind: 'aow', name: 'Market Intelligence', count: 9 },
    { key: 'INTERMEDIATE', kind: 'outcome', name: 'Intermediate outcomes', count: 6 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('scopeOptions', options);
    fixture.detectChanges();
  });

  function optionButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));
  }

  function groupEls(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[role="group"]'));
  }

  it('groups options in the pinned order — Areas of work, Strategic outcomes, Outside the Theory of Change (OSF-AC-2)', () => {
    const groups = groupEls();
    expect(groups.map(g => g.getAttribute('aria-label'))).toEqual(['Areas of work', 'Strategic outcomes', 'Outside the Theory of Change']);

    // Within the AoW group, options keep their `scopeOptions()` relative order (AOW02 then AOW01).
    const aowOptions = Array.from(groups[0].querySelectorAll('[role="option"]')).map(el => el.getAttribute('id'));
    expect(aowOptions).toEqual([component.scopeOptionId('AOW02'), component.scopeOptionId('AOW01')]);
  });

  it('group headers are not options and are excluded from the keyboard order (OSF-DD-13)', () => {
    const headerTexts = ['Areas of work', 'Strategic outcomes', 'Outside the Theory of Change'];
    for (const opt of optionButtons()) {
      expect(headerTexts).not.toContain(opt.textContent?.trim());
    }
    // `null` ("All areas and outcomes") + 5 real options — no header keys leaked in.
    expect(component.scopeFlatKeys()).toEqual([null, 'AOW02', 'AOW01', 'INTERMEDIATE', 'EOI_2030', 'UNTAGGED']);
  });

  it('renders the "All areas and outcomes" default row selected when selectedScope is null', () => {
    const allRow = fixture.nativeElement.querySelector(`#${component.scopeOptionId(null)}`) as HTMLElement;
    expect(allRow.getAttribute('role')).toBe('option');
    expect(allRow.getAttribute('aria-selected')).toBe('true');
    expect(fixture.nativeElement.querySelector('button[role="combobox"]').textContent).toContain('All areas and outcomes');
  });

  it('exposes the result count in each option\'s accessible name, not left to adjacent visual text (OSF-DD-13)', () => {
    const aow01 = fixture.nativeElement.querySelector(`#${component.scopeOptionId('AOW01')}`) as HTMLElement;
    expect(aow01.getAttribute('aria-label')).toBe('Market Intelligence, 9 results');
    const eoi = fixture.nativeElement.querySelector(`#${component.scopeOptionId('EOI_2030')}`) as HTMLElement;
    expect(eoi.getAttribute('aria-label')).toBe('2030 outcomes, 3 results');
  });

  it('truncated option labels expose their full value via title (OSF-R-10)', () => {
    const aow01 = fixture.nativeElement.querySelector(`#${component.scopeOptionId('AOW01')}`) as HTMLElement;
    const nameSpan = aow01.querySelector('[title]') as HTMLElement;
    expect(nameSpan.getAttribute('title')).toBe('Market Intelligence');
  });

  // `OSF-T-14` rework — the popover option list is a THIRD display site for the raw key; routing it
  // through the same single-homed mapping is what keeps the mapping single-homed at all (the whole
  // point of `OSF-DD-6` discipline). `aria-hidden` was already correct here — untouched.
  it('OSF-T-14 rework: the popover option list renders the mapped short code too, not the raw key', () => {
    const intermediate = fixture.nativeElement.querySelector(`#${component.scopeOptionId('INTERMEDIATE')}`) as HTMLElement;
    const codeSpan = intermediate.querySelector('.pr-code') as HTMLElement;
    expect(codeSpan.textContent?.trim()).toBe('INT');
    expect(codeSpan.getAttribute('aria-hidden')).toBe('true');

    const untagged = fixture.nativeElement.querySelector(`#${component.scopeOptionId('UNTAGGED')}`) as HTMLElement;
    expect((untagged.querySelector('.pr-code') as HTMLElement).textContent?.trim()).toBe('—');

    const aow01 = fixture.nativeElement.querySelector(`#${component.scopeOptionId('AOW01')}`) as HTMLElement;
    expect((aow01.querySelector('.pr-code') as HTMLElement).textContent?.trim()).toBe('AOW01'); // unchanged
  });

  it('trigger carries role=combobox, aria-haspopup=listbox, aria-controls and aria-expanded reflecting open state', () => {
    const trigger = fixture.nativeElement.querySelector('button[role="combobox"]') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // `aria-controls` links the trigger to the listbox panel — Spartan's popover does not wire this
    // itself (OSF-DD-13's Trigger row), so it must point at the panel's actual id, not just be present.
    expect(trigger.getAttribute('aria-controls')).toBe(component.scopeListboxId);

    component.openScopePopover();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    const panel = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    expect(panel.getAttribute('id')).toBe(component.scopeListboxId);
  });

  describe('keyboard contract (OSF-DD-13) — simulated key events, not attribute presence', () => {
    beforeEach(() => {
      component.openScopePopover();
      fixture.detectChanges();
    });

    function dispatchOnList(key: string): void {
      const list = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
      list.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    }

    it('ArrowDown from the last option of a group lands on the next group\'s FIRST option, never its header', () => {
      // scopeFlatKeys: [null, 'AOW02', 'AOW01', 'INTERMEDIATE', 'EOI_2030', 'UNTAGGED']
      component.activeScopeKey.set('AOW01'); // last option of the "Areas of work" group
      dispatchOnList('ArrowDown');
      expect(component.activeScopeKey()).toBe('INTERMEDIATE'); // first option of "Strategic outcomes"

      component.activeScopeKey.set('EOI_2030'); // last option of "Strategic outcomes"
      dispatchOnList('ArrowDown');
      expect(component.activeScopeKey()).toBe('UNTAGGED'); // first (only) option of "Outside the ToC"
    });

    it('ArrowUp mirrors ArrowDown and stops at the first entry ("All areas and outcomes")', () => {
      component.activeScopeKey.set('AOW02');
      dispatchOnList('ArrowUp');
      expect(component.activeScopeKey()).toBe(null);
      dispatchOnList('ArrowUp'); // already at the top — stays clamped, does not throw
      expect(component.activeScopeKey()).toBe(null);
    });

    it('Enter selects the active option, closes the popover and emits scopeChange', () => {
      const emitted: (string | null)[] = [];
      component.scopeChange.subscribe(v => emitted.push(v));

      component.activeScopeKey.set('AOW01');
      dispatchOnList('Enter');

      expect(emitted).toEqual(['AOW01']);
      expect(component.scopeOpen()).toBe(false);
    });

    it('Escape closes the popover and returns focus to the trigger (OSF-DD-13)', async () => {
      const trigger = fixture.nativeElement.querySelector('button[role="combobox"]') as HTMLButtonElement;
      const focusSpy = jest.spyOn(trigger, 'focus');

      dispatchOnList('Escape');
      expect(component.scopeOpen()).toBe(false);

      // Focus restore is deferred a microtask (the listbox-focus effect's own precedent).
      await Promise.resolve();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('aria-activedescendant tracks the active option, never a header id', () => {
      component.activeScopeKey.set('INTERMEDIATE');
      fixture.detectChanges();
      const list = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
      expect(list.getAttribute('aria-activedescendant')).toBe(component.scopeOptionId('INTERMEDIATE'));
    });
  });

  it('clicking an option emits scopeChange with that key and closes the popover', () => {
    const emitted: (string | null)[] = [];
    component.scopeChange.subscribe(v => emitted.push(v));
    component.openScopePopover();
    fixture.detectChanges();

    const aow02 = fixture.nativeElement.querySelector(`#${component.scopeOptionId('AOW02')}`) as HTMLButtonElement;
    aow02.click();

    expect(emitted).toEqual(['AOW02']);
    expect(component.scopeOpen()).toBe(false);
  });

  it('ArrowDown on the closed trigger opens the popover (OSF-DD-13 Keys row)', () => {
    const trigger = fixture.nativeElement.querySelector('button[role="combobox"]') as HTMLButtonElement;
    expect(component.scopeOpen()).toBe(false);
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(component.scopeOpen()).toBe(true);
  });
});

// @akili-spec changes/overview-aow-cross-filter — OSF-T-9: accessibility conformance of the scope
// control. jsdom loads no Tailwind CSS, so it cannot compute `box-shadow` from a class or evaluate a
// contrast ratio (`execution.md` §13/§14) — these are class-presence regression guards ONLY, proven
// against the broken markup by asserting the correct utility present AND the broken one absent. The
// actual effect (a visible focus ring, a ≥3:1 boundary, a ≥4.5:1 header) is re-measured in-browser
// and recorded in `execution.md`, per the task's own instruction.
describe('ProgramOverviewComponent — scope control accessibility conformance (OSF-T-9)', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;
  let component: ProgramOverviewComponent;

  const options: OverviewScopeOption[] = [
    { key: 'AOW01', kind: 'aow', name: 'Market Intelligence', count: 9 },
    { key: 'AOW02', kind: 'aow', name: 'Accelerated Breeding', count: 4 }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('scopeOptions', options);
    fixture.detectChanges();
  });

  it('trigger carries the corrected focus-visible shadow utility, not the invalid ring-color utility that painted nothing', () => {
    const trigger = fixture.nativeElement.querySelector('button[role="combobox"]') as HTMLButtonElement;
    // Positive half: the utility that actually assigns `--pr-focus-ring` (a box-shadow value) to
    // `box-shadow`, matching the working precedent at `:944`/`:956`/`:968`/`:1152`/`:1164`/`:1176`.
    expect(trigger.className).toContain('focus-visible:shadow-[var(--pr-focus-ring)]');
    // Negative half — the teeth: `ring-[var(--pr-focus-ring)]` feeds a box-shadow expression into
    // `--tw-ring-color`, which expects a color, and silently paints nothing. A bare "some focus
    // class exists" assertion would have passed against the bug; this would not.
    expect(trigger.className).not.toContain('ring-[var(--pr-focus-ring)]');
    expect(trigger.className).not.toContain('ring-2');
  });

  it('the active option carries a visible border (WCAG 1.4.11), not the tinted background alone', () => {
    component.openScopePopover();
    component.activeScopeKey.set('AOW01');
    fixture.detectChanges();

    const active = fixture.nativeElement.querySelector(`#${component.scopeOptionId('AOW01')}`) as HTMLElement;
    // Positive half: a border built on `--pr-color-primary-300` — the token this file's own
    // `colors.scss` comment reserves for focus/active indicators (measures 5.78:1 on white, well
    // above the 3:1 non-text UI floor `--pr-surface-band` alone measured 1.09:1 against).
    expect(active.className).toContain('border-[var(--pr-color-primary-300)]');
    expect(active.className).not.toContain('border-transparent');
    // `--pr-surface-band` itself is untouched — the shared token's value is not the fix.
    expect(active.className).toContain('bg-[var(--pr-surface-band)]');

    const inactive = fixture.nativeElement.querySelector(`#${component.scopeOptionId('AOW02')}`) as HTMLElement;
    expect(inactive.className).toContain('border-transparent');
    expect(inactive.className).not.toContain('border-[var(--pr-color-primary-300)]');
  });

  it('the "All areas and outcomes" row carries the same border treatment when active', () => {
    component.openScopePopover(); // seeds activeScopeKey from selectedScope() — null, i.e. "All"
    fixture.detectChanges();

    const allRow = fixture.nativeElement.querySelector(`#${component.scopeOptionId(null)}`) as HTMLElement;
    expect(allRow.className).toContain('border-[var(--pr-color-primary-300)]');
    expect(allRow.className).not.toContain('border-transparent');
  });

  it('group headers use --pr-text-muted (5.53:1), not --pr-text-subtle (3.04:1, fails WCAG 1.4.3)', () => {
    component.openScopePopover();
    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('[role="group"] p[aria-hidden="true"]') as HTMLElement;
    expect(header.className).toContain('text-[var(--pr-text-muted)]');
    expect(header.className).not.toContain('text-[var(--pr-text-subtle)]');
  });

  it('aria-selected / aria-activedescendant semantics are untouched by the visual fix (not a screen-reader gap)', () => {
    component.openScopePopover();
    component.activeScopeKey.set('AOW01');
    fixture.detectChanges();

    const active = fixture.nativeElement.querySelector(`#${component.scopeOptionId('AOW01')}`) as HTMLElement;
    expect(active.getAttribute('aria-selected')).toBe('false'); // active (keyboard cursor) !== selected
    const list = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    expect(list.getAttribute('aria-activedescendant')).toBe(component.scopeOptionId('AOW01'));
  });
});

// @akili-spec changes/overview-aow-cross-filter — OSF-T-7: the three honest states — the
// `Program-wide` declaration on the W1/W2 category×status card, the hero's no-plan treatment, and
// the unfiltered per-scope breakdown. Own TestBed setup (same echarts mocks above) because these
// scenarios need `w12Heatmap`/`richRows`/`scopeBreakdown` inputs the OSF-T-6 suite never sets.
//
// Disqualifier this suite does NOT try to clear (per the task brief): asserting the `Program-wide`
// pill renders proves PRESENCE, not that the figures beside it are the program-wide ones — that
// proof is `OSF-T-8`'s browser check.
describe('ProgramOverviewComponent — overview states (OSF-T-7)', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;
  let component: ProgramOverviewComponent;

  const w12Model: HeatmapModel = {
    rows: ['Knowledge product'],
    cols: ['Editing'],
    cells: [{ r: 0, c: 0, value: 3, link: null }],
    caption: 'W1/W2 results by category and status'
  };

  function makeRichRow(overrides: Partial<OverviewAowProgressRowRich> = {}): OverviewAowProgressRowRich {
    return {
      code: 'AOW01',
      name: 'Market Intelligence',
      complete: 0,
      inProgress: 0,
      notStarted: 0,
      zeroTarget: 0,
      reported: 0,
      total: 0,
      remaining: 0,
      ...overrides
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    component = fixture.componentInstance;
  });

  function detect(): void {
    fixture.detectChanges();
  }

  /** The hero card ("Progress by area of work") — scoped so assertions like "never 0%" don't false-
   *  positive on the page's OTHER cards (KPI summary tiles, W3/Bilateral "Approved: 0%", etc). */
  function heroSection(): HTMLElement {
    const heading = Array.from(fixture.nativeElement.querySelectorAll('h2')).find(
      (h: HTMLElement) => h.textContent?.trim() === 'Progress by area of work'
    ) as HTMLElement;
    return heading.closest('section') as HTMLElement;
  }

  describe('Program-wide declaration on the category×status card (OSF-R-5, OSF-AC-6)', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('w12Heatmap', w12Model);
    });

    it('is ABSENT when unfiltered — the pill must not leak into the default view (OSF-AC-1)', () => {
      fixture.componentRef.setInput('selectedScope', null);
      detect();
      expect(fixture.nativeElement.textContent).not.toContain('Program-wide');
    });

    it('renders the pill AND the explanatory sentence whenever a scope is active', () => {
      fixture.componentRef.setInput('scopeOptions', [
        { key: 'AOW01', kind: 'aow', name: 'Market Intelligence', count: 9 }
      ] satisfies OverviewScopeOption[]);
      fixture.componentRef.setInput('selectedScope', 'AOW01');
      detect();

      expect(fixture.nativeElement.textContent).toContain('Program-wide');
      expect(fixture.nativeElement.textContent).toContain(
        'This card has no area-of-work dimension in its data'
      );
    });
  });

  describe('No-plan hero treatment (OSF-R-6, OSF-AC-7)', () => {
    it('unfiltered + empty richRows keeps the PRE-EXISTING empty state — no em-dash, no no-plan copy (OSF-AC-1)', () => {
      fixture.componentRef.setInput('selectedScope', null);
      fixture.componentRef.setInput('richRows', []);
      detect();

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('No areas of work loaded yet.');
      expect(text).not.toContain('No planned KPIs for this scope');
    });

    it('a scope with no matching AoW row (an outcome/untagged key) replaces the ring+splits with an em-dash and a sentence — never 0%, never 0 of 0', () => {
      fixture.componentRef.setInput('scopeOptions', [
        { key: 'UNTAGGED', kind: 'untagged', name: 'Not tagged to a ToC area', count: 12 }
      ] satisfies OverviewScopeOption[]);
      fixture.componentRef.setInput('selectedScope', 'UNTAGGED');
      // `filterRowsByScope` (the host) never matches an AoW row against a non-AoW scope key —
      // richRows arrives empty, exactly as the real host would hand it.
      fixture.componentRef.setInput('richRows', []);
      detect();

      const text = heroSection().textContent as string;
      expect(text).toContain('—'); // em-dash
      expect(text).toContain('No planned KPIs for this scope');
      expect(text).not.toContain('0%');
      expect(text).not.toMatch(/0 of 0/);
      // The row-list side of the hero shows the same no-plan explanation, not a 0/0 row or the
      // generic "not loaded yet" copy.
      expect(text).toContain('has no planned KPIs');
      expect(text).not.toContain('No areas of work loaded yet.');

      const clearButton = Array.from(heroSection().querySelectorAll('button')).find(
        (b: HTMLButtonElement) => b.textContent?.trim() === 'Show all areas and outcomes'
      ) as HTMLButtonElement | undefined;
      expect(clearButton).toBeTruthy();

      const emitted: (string | null)[] = [];
      component.scopeChange.subscribe(v => emitted.push(v));
      clearButton!.click();
      expect(emitted).toEqual([null]);
    });

    it('a matched AoW row whose OWN total is 0 still reads as no-plan, never as a 0/0 row (bucket-total-0 input)', () => {
      fixture.componentRef.setInput('scopeOptions', [
        { key: 'AOW01', kind: 'aow', name: 'Market Intelligence', count: 5 }
      ] satisfies OverviewScopeOption[]);
      fixture.componentRef.setInput('selectedScope', 'AOW01');
      fixture.componentRef.setInput('richRows', [makeRichRow({ code: 'AOW01', total: 0 })]);
      detect();

      const text = heroSection().textContent as string;
      expect(text).not.toContain('0%');
      expect(text).not.toMatch(/0 of 0/);
      expect(text).toContain('has no planned KPIs');
    });

    it('a filtered scope WITH a plan renders the real ring, not the no-plan copy (regression guard)', () => {
      fixture.componentRef.setInput('scopeOptions', [
        { key: 'AOW01', kind: 'aow', name: 'Market Intelligence', count: 5 }
      ] satisfies OverviewScopeOption[]);
      fixture.componentRef.setInput('selectedScope', 'AOW01');
      fixture.componentRef.setInput('richRows', [makeRichRow({ code: 'AOW01', total: 10, reported: 4, complete: 4 })]);
      detect();

      const text = heroSection().textContent as string;
      expect(text).not.toContain('No planned KPIs for this scope');
      expect(text).toContain('40%'); // 4 of 10
    });
  });

  describe('Per-scope breakdown (OSF-R-13)', () => {
    // `byStatus` counts sum to each row's own `count` — same relationship as the mockup's
    // `bucketTotal(r)` denominator (`OSF-T-13`). Status ids: 1 Editing, 2 In QA, 3 Submitted.
    const breakdown: OverviewScopeBreakdown = {
      rows: [
        { key: 'AOW02', kind: 'aow', name: 'Accelerated Breeding', count: 8, byStatus: { 1: 5, 3: 2, 2: 1 } },
        { key: 'AOW01', kind: 'aow', name: 'Market Intelligence', count: 39, byStatus: { 1: 22, 3: 1, 2: 9, 6: 6, 4: 1 } },
        { key: 'INTERMEDIATE', kind: 'outcome', name: 'Intermediate outcomes', count: 12, byStatus: { 1: 8, 2: 3, 6: 1 } },
        { key: 'EOI_2030', kind: 'outcome', name: '2030 outcomes', count: 4, byStatus: { 1: 3, 2: 1 } },
        { key: 'UNTAGGED', kind: 'untagged', name: 'Not tagged to a ToC area', count: 0, byStatus: {} }
      ],
      aowSubtotal: 47,
      total: 63
    };

    it('is ABSENT while a scope is selected — it only makes sense unfiltered', () => {
      fixture.componentRef.setInput('scopeBreakdown', breakdown);
      fixture.componentRef.setInput('selectedScope', 'AOW01');
      detect();
      expect(fixture.nativeElement.textContent).not.toContain('By scope');
    });

    it('renders grouped headers in the pinned order, the AoW subtotal, the All-scopes total and the reconciliation sentence — literal expected values', () => {
      fixture.componentRef.setInput('scopeBreakdown', breakdown);
      fixture.componentRef.setInput('selectedScope', null);
      detect();

      const text = fixture.nativeElement.textContent as string;
      const iAow = text.indexOf('Areas of work');
      const iOutcomes = text.indexOf('Strategic outcomes');
      const iOutside = text.indexOf('Outside the Theory of Change');
      expect(iAow).toBeGreaterThan(-1);
      expect(iOutcomes).toBeGreaterThan(iAow);
      expect(iOutside).toBeGreaterThan(iOutcomes);

      expect(text).toContain('Areas of work subtotal');
      expect(text).toContain('47'); // literal aowSubtotal from the fixture, not re-derived
      expect(text).toContain('All scopes');
      expect(text).toContain('63'); // literal total from the fixture
      expect(text).toContain('Not tagged to a ToC area'); // verbatim label, design.md §5
      expect(text).toContain('Areas of work alone come to');
    });

    it('a row whose count is 0 still renders — it is not hidden (the OSF-T-7 input-that-would-make-it-fail case)', () => {
      fixture.componentRef.setInput('scopeBreakdown', breakdown);
      fixture.componentRef.setInput('selectedScope', null);
      detect();

      const untaggedRow = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b: HTMLButtonElement) => b.textContent?.includes('Not tagged to a ToC area')
      ) as HTMLButtonElement | undefined;
      expect(untaggedRow).toBeTruthy();
      expect(untaggedRow!.textContent).toContain('0');
    });

    it('clicking a breakdown row emits scopeChange with that row\'s key — rows select that scope', () => {
      fixture.componentRef.setInput('scopeBreakdown', breakdown);
      fixture.componentRef.setInput('selectedScope', null);
      detect();

      const emitted: (string | null)[] = [];
      component.scopeChange.subscribe(v => emitted.push(v));

      const aow02Row = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b: HTMLButtonElement) => b.textContent?.includes('Accelerated Breeding')
      ) as HTMLButtonElement;
      aow02Row.click();

      expect(emitted).toEqual(['AOW02']);
    });

    // `OSF-T-14` — SUPERSEDES `OSF-T-11`'s "no code chip" fix (updated in place, per the task's own
    // instruction, rather than left asserting the superseded behaviour). `OSF-T-11` hid the
    // `INTERMEDIATE` code entirely because the raw enum key overflowed its 62px track; the approved
    // mockup's own answer — kept but never checked by `OSF-T-11`'s Leader, who diagnosed statically
    // — is a SHORT display code, which keeps the information instead of removing it.
    it('OSF-T-14: non-AoW rows render the mapped short display code (aria-hidden — the row name carries the accessible meaning); AoW codes are unchanged', () => {
      fixture.componentRef.setInput('scopeBreakdown', breakdown);
      fixture.componentRef.setInput('selectedScope', null);
      detect();

      const codeFor = (name: string) => {
        const row = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
          (b: HTMLButtonElement) => b.textContent?.includes(name)
        ) as HTMLButtonElement;
        const codeEl = row.querySelector('.pr-code') as HTMLElement;
        return { text: codeEl.textContent?.trim() ?? '', ariaHidden: codeEl.getAttribute('aria-hidden') };
      };

      // AoW rows: unchanged — already user-facing codes.
      expect(codeFor('Market Intelligence')).toEqual({ text: 'AOW01', ariaHidden: 'true' });
      expect(codeFor('Accelerated Breeding')).toEqual({ text: 'AOW02', ariaHidden: 'true' });

      // Non-AoW rows: the mockup's short codes — the raw enum key must never leak into the text.
      expect(codeFor('Intermediate outcomes')).toEqual({ text: 'INT', ariaHidden: 'true' });
      expect(codeFor('2030 outcomes')).toEqual({ text: '2030', ariaHidden: 'true' });
      // The untagged bucket's code is a bare em-dash — not an accessible name on its own, so the
      // glyph is `aria-hidden` and the row's (non-hidden) name span carries the meaning instead.
      expect(codeFor('Not tagged to a ToC area')).toEqual({ text: '—', ariaHidden: 'true' });

      const intermediateRow = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b: HTMLButtonElement) => b.textContent?.includes('Intermediate outcomes')
      ) as HTMLButtonElement;
      expect(intermediateRow.textContent).not.toContain('INTERMEDIATE');
    });

    it('OSF-T-14: clicking a non-AoW row still emits the RAW key, never the display code — the round-trip selection/URL wiring is untouched (display only)', () => {
      fixture.componentRef.setInput('scopeBreakdown', breakdown);
      fixture.componentRef.setInput('selectedScope', null);
      detect();

      const emitted: (string | null)[] = [];
      component.scopeChange.subscribe(v => emitted.push(v));

      const intermediateRow = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b: HTMLButtonElement) => b.textContent?.includes('Intermediate outcomes')
      ) as HTMLButtonElement;
      intermediateRow.click();

      expect(emitted).toEqual(['INTERMEDIATE']);
    });

    it('OSF-T-14: scopeTriggerCode() routes through the same single-homed mapping, closing the execution.md §17 trigger inconsistency', () => {
      fixture.componentRef.setInput('scopeOptions', breakdown.rows);
      fixture.componentRef.setInput('scopeBreakdown', breakdown);

      fixture.componentRef.setInput('selectedScope', 'INTERMEDIATE');
      detect();
      expect(component.scopeTriggerCode()).toBe('INT');
      expect(component.scopeTriggerCode()).not.toContain('INTERMEDIATE');

      fixture.componentRef.setInput('selectedScope', 'UNTAGGED');
      detect();
      expect(component.scopeTriggerCode()).toBe('—');

      fixture.componentRef.setInput('selectedScope', 'AOW01');
      detect();
      expect(component.scopeTriggerCode()).toBe('AOW01'); // AoW codes already user-facing, unchanged
    });

    // `OSF-T-14` REWORK (Reviewer finding) — at 900-1099px the trigger's ONLY visible span was the
    // code-only chip; once the code is `aria-hidden` (decorative, same treatment as the breakdown
    // row), that width band had NO accessible name at all for the untagged scope's bare "—". Fixed
    // with an always-present `sr-only` span carrying the FULL label, composing with (never replacing)
    // the existing content-based name. This is the negative-half test the Reviewer asked for — it
    // fails against the pre-rework markup, where no `.sr-only` span existed at all.
    it('OSF-T-14 rework: the trigger always exposes an sr-only span with the FULL label, and its code chips are aria-hidden — the untagged scope\'s bare "—" is never the sole accessible text', () => {
      fixture.componentRef.setInput('scopeOptions', breakdown.rows);
      fixture.componentRef.setInput('scopeBreakdown', breakdown);
      fixture.componentRef.setInput('selectedScope', 'UNTAGGED');
      detect();

      const trigger = fixture.nativeElement.querySelector('button[role="combobox"]') as HTMLButtonElement;
      const srOnly = trigger.querySelector('.sr-only') as HTMLElement;
      expect(srOnly).toBeTruthy();
      expect(srOnly.textContent?.trim()).toBe('Not tagged to a ToC area'); // full label, never the bare glyph
      expect(srOnly.getAttribute('aria-hidden')).not.toBe('true'); // must stay in the accessibility tree
      expect(srOnly.textContent?.trim()).not.toBe('—');

      const codeChips = Array.from(trigger.querySelectorAll('.pr-code')) as HTMLElement[];
      expect(codeChips.length).toBeGreaterThan(0);
      for (const chip of codeChips) {
        expect(chip.getAttribute('aria-hidden')).toBe('true');
      }
    });

    // `OSF-T-13` — the mockup's 4th column (a 150px segmented status bar) was never shipped by
    // `OSF-T-7`; all three row shapes stayed at 3 tracks. Restored here, matching the mockup exactly.
    describe('Segmented status bar (OSF-T-13, mockup drift)', () => {
      it('the option row, the AoW subtotal row and the All-scopes total row all carry the 4-track grid — the bar cell present (empty on subtotal/total, exactly as the mockup does)', () => {
        fixture.componentRef.setInput('scopeBreakdown', breakdown);
        fixture.componentRef.setInput('selectedScope', null);
        detect();

        const optionRow = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
          (b: HTMLButtonElement) => b.textContent?.includes('Accelerated Breeding')
        ) as HTMLButtonElement;
        expect(optionRow.className).toContain('grid-cols-[62px_minmax(0,1fr)_150px_46px]');
        expect(optionRow.querySelector('[role="img"]')).toBeTruthy();

        // Subtotal + total rows, found by their own distinguishing utility classes (a plain
        // `div.grid` selector also matches the page's own outer 12-col grid).
        const allDivs = Array.from(fixture.nativeElement.querySelectorAll('div')) as HTMLElement[];
        const subtotalRow = allDivs.find(d => d.className.includes('grid-cols-[62px') && d.className.includes('py-[7px]'))!;
        const totalRow = allDivs.find(d => d.className.includes('grid-cols-[62px') && d.className.includes('border-t-2'))!;

        expect(subtotalRow.textContent).toContain('Areas of work subtotal');
        expect(subtotalRow.className).toContain('grid-cols-[62px_minmax(0,1fr)_150px_46px]');
        expect(subtotalRow.children.length).toBe(4); // code · name · EMPTY bar cell · total
        expect(subtotalRow.children[2].getAttribute('role')).not.toBe('img');
        expect(subtotalRow.children[2].textContent?.trim()).toBe('');

        expect(totalRow.textContent).toContain('All scopes');
        expect(totalRow.className).toContain('grid-cols-[62px_minmax(0,1fr)_150px_46px]');
        expect(totalRow.children.length).toBe(4);
        expect(totalRow.children[2].getAttribute('role')).not.toBe('img');
        expect(totalRow.children[2].textContent?.trim()).toBe('');
      });

      it('segment widths are COMPUTED IN TS from the row\'s own byStatus, honest at 1% (OAH-R-3) — never template arithmetic', () => {
        const row = breakdown.rows.find(r => r.key === 'AOW02')!;
        // 5 editing / 2 submitted / 1 in-QA of 8 total.
        expect(component.breakdownEditingWidth(row)).toBeCloseTo(62.5, 5);
        expect(component.breakdownSubmittedWidth(row)).toBeCloseTo(25, 5);
        expect(component.breakdownQaWidth(row)).toBeCloseTo(12.5, 5);

        // AOW01: 22/39 editing, etc. — includes approved(6)/discontinued(1) in the denominator but
        // paints no segment for them, same as the mockup's own bucketTotal(r) — segments need not
        // sum to 100% width.
        const aow01 = breakdown.rows.find(r => r.key === 'AOW01')!;
        expect(component.breakdownEditingWidth(aow01)).toBeCloseTo((22 / 39) * 100, 5);
        expect(component.breakdownSubmittedWidth(aow01)).toBeCloseTo((1 / 39) * 100, 5);
        expect(component.breakdownQaWidth(aow01)).toBeCloseTo((9 / 39) * 100, 5);

        // A row with no byStatus data (e.g. an untagged bucket with count 0) never divides by zero.
        const untagged = breakdown.rows.find(r => r.key === 'UNTAGGED')!;
        expect(component.breakdownEditingWidth(untagged)).toBe(0);
        expect(component.breakdownSubmittedWidth(untagged)).toBe(0);
        expect(component.breakdownQaWidth(untagged)).toBe(0);
      });

      it('the bar carries role="img" and an aria-label naming the three counts (OAH-N-1 precedent — a roleless span is not announced)', () => {
        fixture.componentRef.setInput('scopeBreakdown', breakdown);
        fixture.componentRef.setInput('selectedScope', null);
        detect();

        const optionRow = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
          (b: HTMLButtonElement) => b.textContent?.includes('Accelerated Breeding')
        ) as HTMLButtonElement;
        const bar = optionRow.querySelector('[role="img"]') as HTMLElement;
        expect(bar.getAttribute('aria-label')).toBe('5 Editing, 2 Submitted, 1 In QA');
      });
    });
  });
});

// `OSF-T-2b` — AoW row responsive ladder (design.md `OSF-DD-8` §8.2). jsdom performs no layout
// (`getBoundingClientRect` returns zeros, grid tracks never resolve) so this suite CANNOT prove the
// ladder works — that is `OSF-T-8`'s browser measurement (`execution.md` §13), re-run for this task
// via the same `orca eval`/`set viewport` recipe. What jsdom CAN prove, and what earns this suite's
// place: that the responsive Tailwind classes the ladder depends on are actually present on BOTH row
// sites' markup, so a future edit that silently deletes or "simplifies" them away — the exact way
// `KZ-OAH-1` reached the branch twice before — fails a test instead of shipping unnoticed.
describe('ProgramOverviewComponent — AoW row responsive ladder (OSF-T-2b)', () => {
  let fixture: ComponentFixture<ProgramOverviewComponent>;

  function makeRichRow(overrides: Partial<OverviewAowProgressRowRich> = {}): OverviewAowProgressRowRich {
    return {
      code: 'AOW01',
      name: 'Market Intelligence',
      complete: 0,
      inProgress: 0,
      notStarted: 0,
      zeroTarget: 0,
      reported: 1,
      total: 18,
      remaining: 17,
      ...overrides
    };
  }

  const achievement: TocAchievement = {
    progress_percentage: '19.4',
    preliminary_progress_percentage: '0.6',
    progress_value: 19.4,
    preliminary_value: 0.6,
    counted: 84,
    total: 437,
    indicators_counted: 382,
    indicators_total: 437
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProgramOverviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(ProgramOverviewComponent);
    fixture.componentRef.setInput('richRows', [makeRichRow({ achievement })]);
    fixture.detectChanges();
  });

  /** The real (non-skeleton) AoW row — the `@for (row of richRows())` grid container. */
  function realRow(): HTMLElement {
    return fixture.nativeElement.querySelector(
      'div.group.grid[class*="grid-cols-\\[minmax\\(0\\,1fr\\)_minmax\\(120px\\,240px\\)_max-content_max-content_max-content\\]"]'
    ) as HTMLElement;
  }

  it('the real row carries the drop-achievement-track and two-line-stack grid overrides, tiled with NO gap at 900px', () => {
    const row = realRow();
    expect(row).toBeTruthy();
    // `max-[…]:` is exclusive (`width < N`) — `max-[900px]` and `min-[900px]` must use the SAME
    // boundary value to tile with no gap at exactly 900px (rework: `max-[899px]` left width=899
    // matching neither band; caught by Reviewer).
    expect(row.className).toContain('min-[900px]:max-[1101px]:grid-cols-[minmax(0,1fr)_minmax(120px,240px)_max-content_max-content]');
    expect(row.className).toContain('max-[900px]:grid-cols-[minmax(0,1fr)_max-content]');
  });

  it('every real-row cell that must move for the <900px stack carries its explicit grid placement', () => {
    const row = realRow();
    // identity, bar, figures, and BOTH action-variant wrappers (only one renders per row state).
    const identity = row.querySelector('.flex.min-w-0.items-center.gap-\\[10px\\]') as HTMLElement;
    const bar = row.querySelector('[role="img"]') as HTMLElement;
    const figures = row.querySelector('.flex.flex-col.items-end:not(.leading-tight)') as HTMLElement;
    const actions = row.querySelector('.flex.justify-end') as HTMLElement;

    expect(identity.className).toContain('max-[900px]:[grid-column:1]');
    expect(identity.className).toContain('max-[900px]:[grid-row:1]');
    expect(bar.className).toContain('max-[900px]:[grid-column:1]');
    expect(bar.className).toContain('max-[900px]:[grid-row:2]');
    expect(figures.className).toContain('max-[900px]:[grid-column:2]');
    expect(figures.className).toContain('max-[900px]:[grid-row:2]');
    expect(actions.className).toContain('max-[900px]:[grid-column:2]');
    expect(actions.className).toContain('max-[900px]:[grid-row:1]');
  });

  it('the achievement cell narrows below 1280px (tiled with the >=1280 base) and drops entirely at/below 1100px', () => {
    const row = realRow();
    const achievementCell = row.querySelector('.leading-tight') as HTMLElement;
    expect(achievementCell.className).toContain('max-[1101px]:hidden');

    const qaPrelRow = row.querySelector('.leading-tight .items-baseline.whitespace-nowrap') as HTMLElement;
    expect(qaPrelRow.className).toContain('max-[1280px]:flex-col');

    const coverageLine = row.querySelector('.leading-tight span.text-\\[10px\\].text-\\[var\\(--pr-text-muted\\)\\]') as HTMLElement;
    expect(coverageLine.className).toContain('max-[1280px]:hidden');
  });

  it('the row-tooltip fallback is a focusable, keyboard-and-touch-reachable BUTTON whose accessible name carries the real figures — not a generic label', () => {
    const row = realRow();
    // Scoped to the identity block so this can't accidentally match the achievement cell's own
    // (hover-only, sighted-pointer) tooltip host a few lines down in the same row.
    const identityBlock = row.querySelector('.flex.min-w-0.items-center.gap-\\[10px\\]') as HTMLElement;
    const fallback = identityBlock.querySelector('button') as HTMLButtonElement;

    expect(fallback).toBeTruthy();
    expect(fallback.tagName).toBe('BUTTON'); // focusable — a <span> is not (Reviewer finding)
    expect(fallback.getAttribute('type')).toBe('button');
    // The accessible name IS the achievement figures, not a placeholder label.
    expect(fallback.getAttribute('aria-label')).toContain('QA 19.4');
    expect(fallback.getAttribute('aria-label')).toContain('Preliminary');
    expect(fallback.getAttribute('aria-label')).not.toBe('Achievement against targets');
    // width-gating: mutually exclusive with the achievement cell's own tooltip (test above).
    expect(fallback.className).toContain('hidden');
    expect(fallback.className).toContain('max-[1101px]:inline-flex');
  });

  it('the row-tooltip fallback stops click propagation so tapping it does not ALSO navigate the row', () => {
    const row = realRow();
    const identityBlock = row.querySelector('.flex.min-w-0.items-center.gap-\\[10px\\]') as HTMLElement;
    const fallback = identityBlock.querySelector('button') as HTMLButtonElement;

    let rowNavigated = false;
    row.addEventListener('click', () => (rowNavigated = true));
    fallback.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(rowNavigated).toBe(false);
  });

  it('the skeleton row (richLoading) carries the SAME grid overrides as the real row — no drift between the two sites', () => {
    fixture.componentRef.setInput('richLoading', true);
    fixture.detectChanges();

    const skeletonRow = fixture.nativeElement.querySelector(
      'div.grid[class*="grid-cols-\\[minmax\\(0\\,1fr\\)_minmax\\(120px\\,240px\\)_max-content_max-content_max-content\\]"]'
    ) as HTMLElement;
    expect(skeletonRow).toBeTruthy();
    expect(skeletonRow.className).toContain('min-[900px]:max-[1101px]:grid-cols-[minmax(0,1fr)_minmax(120px,240px)_max-content_max-content]');
    expect(skeletonRow.className).toContain('max-[900px]:grid-cols-[minmax(0,1fr)_max-content]');

    // The 4th placeholder (achievement track) is the one hidden at/below 1100px, same as the real row.
    const placeholders = Array.from(skeletonRow.children) as HTMLElement[];
    expect(placeholders[3].className).toContain('max-[1101px]:hidden');
  });
});
