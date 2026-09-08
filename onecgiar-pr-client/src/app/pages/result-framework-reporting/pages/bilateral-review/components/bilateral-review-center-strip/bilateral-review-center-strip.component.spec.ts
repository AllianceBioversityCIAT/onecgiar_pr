// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-2, R-1, R-2, R-4, R-20, R-21)
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
  }): void {
    fixture.componentRef.setInput('items', partial.items);
    fixture.componentRef.setInput('allPending', partial.allPending);
    fixture.componentRef.setInput('selectedCodes', partial.selectedCodes ?? []);
    if (partial.maxVisible !== undefined) fixture.componentRef.setInput('maxVisible', partial.maxVisible);
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
});
