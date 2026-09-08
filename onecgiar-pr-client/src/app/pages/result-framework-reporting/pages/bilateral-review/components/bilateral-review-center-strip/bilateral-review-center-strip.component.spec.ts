// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-2, R-1, R-2, R-4, R-20, R-21)
// @akili-spec changes/bilateral-review-ux-polish (BRP-T-1, R-3, R-4, AC-2, AC-3, AC-3b)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BilateralReviewCenterStripComponent, BilateralReviewCenterStripItem } from './bilateral-review-center-strip.component';

describe('BilateralReviewCenterStripComponent', () => {
  let fixture: ComponentFixture<BilateralReviewCenterStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BilateralReviewCenterStripComponent] }).compileComponents();
    fixture = TestBed.createComponent(BilateralReviewCenterStripComponent);
  });

  /** BRC-T-2 task fixture: IITA 3 / CIP 2 (+1 approved, not counted) / IWMI 0 (+2 approved) /
   *  Not specified 1 pending — every count differs and one center has 0 pending, so a swapped pair
   *  would be caught (FAIL input named by the task). */
  const ORDERED_ITEMS: BilateralReviewCenterStripItem[] = [
    { code: 'C_IITA', acronym: 'IITA', pending: 3 },
    { code: 'C_CIP', acronym: 'CIP', pending: 2 },
    { code: 'C_IWMI', acronym: 'IWMI', pending: 0 },
    { code: '', acronym: 'Not specified', pending: 1 }
  ];

  function setInputs(partial: {
    items: BilateralReviewCenterStripItem[];
    allPending: number;
    selectedCodes?: string[];
    maxVisible?: number;
    collapsed?: boolean;
  }): void {
    fixture.componentRef.setInput('items', partial.items);
    fixture.componentRef.setInput('allPending', partial.allPending);
    fixture.componentRef.setInput('selectedCodes', partial.selectedCodes ?? []);
    if (partial.maxVisible !== undefined) fixture.componentRef.setInput('maxVisible', partial.maxVisible);
    if (partial.collapsed !== undefined) fixture.componentRef.setInput('collapsed', partial.collapsed);
    fixture.detectChanges();
  }

  const root = () => fixture.nativeElement as HTMLElement;
  const chipButtons = () => Array.from(root().querySelectorAll('button'));

  it('renders "All centers N" then one chip per item in the given order, including a 0-pending center and the trailing Not specified bucket', () => {
    setInputs({ items: ORDERED_ITEMS, allPending: 6 });

    const joined = chipButtons()
      .map(button => button.textContent!.replace(/\s+/g, ' ').trim())
      .join(' · ');

    expect(joined).toBe('All centers 6 · IITA 3 · CIP 2 · IWMI 0 · Not specified 1');
  });

  it('renders no [disabled] attribute anywhere (KZ-REH-2)', () => {
    setInputs({ items: ORDERED_ITEMS, allPending: 6 });

    expect(root().querySelectorAll('[disabled]').length).toBe(0);
  });

  it('is a role="group" with an aria-label, and each chip has an accessible name like "IITA, 3 pending"', () => {
    setInputs({ items: ORDERED_ITEMS, allPending: 6 });

    const group = root().querySelector('[role="group"]');
    expect(group).toBeTruthy();
    expect(group?.getAttribute('aria-label')).toBeTruthy();

    const iitaChip = fixture.debugElement.query(By.css('[data-testid="bilateral-review-center-chip-C_IITA"]')).nativeElement as HTMLElement;
    expect(iitaChip.getAttribute('aria-label')).toBe('IITA, 3 pending');
  });

  describe('pressed states (BRC-R-2)', () => {
    it('All is pressed and no item chip is pressed when selectedCodes is empty', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: [] });

      expect(byTestId('bilateral-review-center-chip-all').getAttribute('aria-pressed')).toBe('true');
      expect(byTestId('bilateral-review-center-chip-C_CIP').getAttribute('aria-pressed')).toBe('false');
    });

    it('exactly the matching item chip is pressed when selectedCodes holds one code', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: ['C_CIP'] });

      expect(byTestId('bilateral-review-center-chip-all').getAttribute('aria-pressed')).toBe('false');
      expect(byTestId('bilateral-review-center-chip-C_CIP').getAttribute('aria-pressed')).toBe('true');
      expect(byTestId('bilateral-review-center-chip-C_IITA').getAttribute('aria-pressed')).toBe('false');
    });

    it('no chip (nor All) is pressed when selectedCodes holds several codes', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: ['C_IITA', 'C_CIP'] });

      expect(byTestId('bilateral-review-center-chip-all').getAttribute('aria-pressed')).toBe('false');
      expect(byTestId('bilateral-review-center-chip-C_IITA').getAttribute('aria-pressed')).toBe('false');
      expect(byTestId('bilateral-review-center-chip-C_CIP').getAttribute('aria-pressed')).toBe('false');
    });
  });

  function byTestId(id: string): HTMLElement {
    return fixture.debugElement.query(By.css(`[data-testid="${id}"]`)).nativeElement as HTMLElement;
  }

  describe('select output (BRC-R-2)', () => {
    it('emits the code on an unpressed chip click', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: [] });
      const spy = jest.fn();
      fixture.componentInstance.selectCenter.subscribe(spy);

      byTestId('bilateral-review-center-chip-C_CIP').click();

      expect(spy).toHaveBeenCalledWith('C_CIP');
    });

    it('emits null when the already-pressed chip is clicked', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: ['C_CIP'] });
      const spy = jest.fn();
      fixture.componentInstance.selectCenter.subscribe(spy);

      byTestId('bilateral-review-center-chip-C_CIP').click();

      expect(spy).toHaveBeenCalledWith(null);
    });

    it('emits null when All centers is clicked', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: ['C_CIP'] });
      const spy = jest.fn();
      fixture.componentInstance.selectCenter.subscribe(spy);

      byTestId('bilateral-review-center-chip-all').click();

      expect(spy).toHaveBeenCalledWith(null);
    });
  });

  describe('"+N more" tail (BRC-R-21)', () => {
    const FOURTEEN_ITEMS: BilateralReviewCenterStripItem[] = Array.from({ length: 14 }, (_, i) => ({
      code: `C${i}`,
      acronym: `CTR${i}`,
      pending: 14 - i
    }));

    it('shows 12 chips + a "+2 more" chip with aria-expanded="false", and expanding reveals all 14', () => {
      setInputs({ items: FOURTEEN_ITEMS, allPending: 105, maxVisible: 12 });

      // 12 item chips + the "All centers" chip = 13 buttons, plus the "+2 more" tail = 14 buttons.
      const itemChips = () => root().querySelectorAll('[data-testid^="bilateral-review-center-chip-C"]');
      expect(itemChips().length).toBe(12);
      const more = byTestId('bilateral-review-center-chip-more');
      expect(more.textContent?.trim()).toBe('+2 more');
      expect(more.getAttribute('aria-expanded')).toBe('false');

      more.click();
      fixture.detectChanges();

      expect(itemChips().length).toBe(14);
      expect(root().querySelector('[data-testid="bilateral-review-center-chip-more"]')).toBeNull();
    });
  });

  describe('collapsed row (BRP-R-3, AC-2, AC-3, AC-3b)', () => {
    it('renders exactly one chip — "All centers 6" pressed — when nothing is selected', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: [], collapsed: true });

      expect(chipButtons().length).toBe(1);
      const chip = byTestId('bilateral-review-center-chip-all');
      expect(chip.textContent?.replace(/\s+/g, ' ').trim()).toBe('All centers 6');
      expect(chip.getAttribute('aria-pressed')).toBe('true');
    });

    it('renders exactly one chip — the selected center with its count and a clear ✕ — when one code is selected', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: ['C_CIP'], collapsed: true });

      const chips = root().querySelectorAll('[data-testid="bilateral-review-center-chip-summary"]');
      expect(chips.length).toBe(1);
      expect(chips[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('CIP 2');
      // The clear ✕ is the summary chip's own nested button — one button total in this state.
      expect(chipButtons().length).toBe(1);
    });

    it('renders exactly one "K centers ✕" chip, unpressed, when several codes are selected', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: ['C_IITA', 'C_CIP'], collapsed: true });

      const chips = root().querySelectorAll('[data-testid="bilateral-review-center-chip-summary"]');
      expect(chips.length).toBe(1);
      expect(chips[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('2 centers');
    });

    it('never shows the "+N more" tail collapsed, even with 14 items (FAIL input the task names)', () => {
      const FOURTEEN_ITEMS: BilateralReviewCenterStripItem[] = Array.from({ length: 14 }, (_, i) => ({
        code: `C${i}`,
        acronym: `CTR${i}`,
        pending: 14 - i
      }));
      setInputs({ items: FOURTEEN_ITEMS, allPending: 105, selectedCodes: [], collapsed: true });

      expect(root().querySelector('[data-testid="bilateral-review-center-chip-more"]')).toBeNull();
      expect(chipButtons().length).toBe(1);
    });

    it('the clear ✕ on the single-selection summary chip emits null', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: ['C_CIP'], collapsed: true });
      const spy = jest.fn();
      fixture.componentInstance.selectCenter.subscribe(spy);

      byTestId('bilateral-review-center-chip-summary').querySelector('button')!.dispatchEvent(new Event('click', { bubbles: true }));

      expect(spy).toHaveBeenCalledWith(null);
    });

    it('the clear ✕ on the "K centers" summary chip emits null', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: ['C_IITA', 'C_CIP'], collapsed: true });
      const spy = jest.fn();
      fixture.componentInstance.selectCenter.subscribe(spy);

      byTestId('bilateral-review-center-chip-summary').querySelector('button')!.dispatchEvent(new Event('click', { bubbles: true }));

      expect(spy).toHaveBeenCalledWith(null);
    });
  });

  describe('tonal count badge classes (BRP-R-4)', () => {
    /** Rendered-class matrix: count > 0 / count = 0, crossed with pressed / unpressed — asserted on
     *  the ACTUAL rendered class string, not by re-deriving it (FAIL input the task names: "verified
     *  by class name only" would not catch a helper that always returns the same string). */
    it('count > 0, unpressed -> primary-100/primary-800 tint', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: [] });
      const badge = byTestId('bilateral-review-center-chip-C_IITA').querySelector('span')!;
      expect(badge.className).toContain('bg-[var(--pr-color-primary-100)]');
      expect(badge.className).toContain('text-[var(--pr-color-primary-800)]');
    });

    it('count > 0, pressed -> primary-700/white', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: ['C_CIP'] });
      const badge = byTestId('bilateral-review-center-chip-C_CIP').querySelector('span')!;
      expect(badge.className).toContain('bg-[var(--pr-color-primary-700)]');
      expect(badge.className).toContain('text-white');
    });

    it('count = 0, unpressed -> neutral surface/secondary text', () => {
      setInputs({ items: ORDERED_ITEMS, allPending: 6, selectedCodes: [] });
      const badge = byTestId('bilateral-review-center-chip-C_IWMI').querySelector('span')!;
      expect(badge.className).toContain('bg-[var(--pr-surface-subtle)]');
      expect(badge.className).toContain('text-[var(--pr-text-secondary)]');
    });
  });
});
