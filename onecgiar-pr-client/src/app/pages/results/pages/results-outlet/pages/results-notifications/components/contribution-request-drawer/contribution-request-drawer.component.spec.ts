// @akili-spec contribution-request-drawer (CRD-T-1, CRD-T-2, CRD-T-4 forward pointer 5)
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ContributionRequestDrawerComponent,
  ContributionRequestDrawerHeaderParts,
  ContributionRequestDrawerMode,
  ContributionRequestDrawerReviewField
} from './contribution-request-drawer.component';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../../internationalization/contribution-request-drawer.copy';

/**
 * CRD-T-1/T-2 falsifier host: drives every input from a signal and projects a `[crdAlign]` marker
 * so we can prove CRD-P-3 (open/close is driven by the `open` input), CRD-P-4 (the projected
 * content renders as part of the sheet's content, not silently dropped), and T-2's render logic.
 *
 * ⚠️ Portal fidelity: `@spartan-ng/brain/*` is globally mocked under Jest
 * (`tests/mocks/spartanBrainMock.ts`, via `moduleNameMapper` — every Brain-based overlay in this
 * repo works this way, not something introduced here) because there is no real CDK Overlay/portal
 * in jsdom. The mock renders the sheet's content INLINE, in place, instead of moving it into a
 * `document.body`-level overlay the way the real `hlm-sheet` does in a browser. So this suite
 * proves the drawer's OWN wiring — it does not and cannot prove the content is portaled into
 * `document.body`, that the 3-line clamp actually truncates visually, or that the mockup layout
 * matches. Those are CRD-T-6 (real browser).
 */
@Component({
  standalone: true,
  imports: [ContributionRequestDrawerComponent],
  template: `
    <app-contribution-request-drawer
      [open]="open()"
      [mode]="mode()"
      [headerParts]="headerParts()"
      [resultCode]="resultCode()"
      [resultTitle]="resultTitle()"
      [reviewRows]="reviewRows()"
      [acceptDisabled]="acceptDisabled()"
      [declineDisabled]="declineDisabled()"
      [acceptBusy]="acceptBusy()"
      [declineBusy]="declineBusy()"
      [blockedReason]="blockedReason()"
      [acceptHelper]="acceptHelper()"
      [focusAlign]="focusAlign()"
      (closed)="onClosed()"
      (resultActivated)="onResultActivated()"
      (acceptClicked)="onAcceptClicked()"
      (declineClicked)="onDeclineClicked()"
      (declineConfirmed)="onDeclineConfirmed()"
      (declineCancelled)="onDeclineCancelled()"
    >
      <div crdAlign data-testid="align-slot">align content</div>
    </app-contribution-request-drawer>
  `
})
class HostComponent {
  readonly open = signal(false);
  readonly mode = signal<ContributionRequestDrawerMode>('decide');
  readonly headerParts = signal<ContributionRequestDrawerHeaderParts | null>(null);
  readonly resultCode = signal('');
  readonly resultTitle = signal('');
  readonly reviewRows = signal<ContributionRequestDrawerReviewField[][]>([]);
  readonly acceptDisabled = signal(false);
  readonly declineDisabled = signal(false);
  readonly acceptBusy = signal(false);
  readonly declineBusy = signal(false);
  readonly blockedReason = signal<string | null>(null);
  readonly acceptHelper = signal<string | null>(null);
  readonly focusAlign = signal(false);

  closedCount = 0;
  resultActivatedCount = 0;
  acceptClickedCount = 0;
  declineClickedCount = 0;
  declineConfirmedCount = 0;
  declineCancelledCount = 0;

  onClosed(): void {
    this.closedCount++;
  }

  onResultActivated(): void {
    this.resultActivatedCount++;
  }

  onAcceptClicked(): void {
    this.acceptClickedCount++;
  }

  onDeclineClicked(): void {
    this.declineClickedCount++;
  }

  onDeclineConfirmed(): void {
    this.declineConfirmedCount++;
  }

  onDeclineCancelled(): void {
    this.declineCancelledCount++;
  }
}

const copy = CONTRIBUTION_REQUEST_DRAWER_COPY;

function buildReviewRow(overrides: Partial<Record<string, string>> = {}): ContributionRequestDrawerReviewField[] {
  const dash = copy.dashValue;
  return [
    { label: copy.fieldLabels.level, value: overrides.level ?? dash },
    { label: copy.fieldLabels.highLevelOutputOutcome, value: overrides.highLevelOutputOutcome ?? dash },
    { label: copy.fieldLabels.outcomeStatement, value: overrides.outcomeStatement ?? dash },
    { label: copy.fieldLabels.indicatorTypology, value: overrides.indicatorTypology ?? dash },
    { label: copy.fieldLabels.unitOfMeasurement, value: overrides.unitOfMeasurement ?? dash },
    { label: copy.fieldLabels.target, value: overrides.target ?? dash, mono: true },
    { label: copy.fieldLabels.contributionTarget, value: overrides.contributionTarget ?? dash, mono: true }
  ];
}

describe('ContributionRequestDrawerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  function panel(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[data-testid="crd-panel"]');
  }

  function query(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  function queryAll(selector: string): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(selector));
  }

  async function openDrawer(): Promise<void> {
    host.open.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('does not render the panel while `open` is false', () => {
    expect(panel()).toBeNull();
  });

  it('CRD-P-3 (jsdom-provable half): opens and closes from the `open` input', async () => {
    await openDrawer();
    expect(panel()).toBeTruthy();

    host.open.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(panel()).toBeNull();
  });

  it('CRD-P-4 (jsdom-provable half): renders the projected [crdAlign] content inside the sheet body', async () => {
    await openDrawer();

    const projected = query('[data-testid="align-slot"]');
    expect(projected).toBeTruthy();
    expect(projected?.textContent).toContain('align content');
    // Lives inside the drawer's scrolling body, not the header/footer.
    expect(query('[data-testid="crd-body"] [data-testid="align-slot"]')).toBeTruthy();
  });

  it('CRD-P-9: the rendered hlm-sheet-content carries the 720px width override', async () => {
    await openDrawer();

    const className = panel()?.className ?? '';
    expect(className).toContain('!w-[720px]');
    expect(className).toContain('sm:!max-w-[720px]');
    expect(className).toContain('max-[639px]:!w-screen');
  });

  it('CRD-T-1 issue 2: the sheet content carries motion-reduce overrides for its transition/animate classes', async () => {
    await openDrawer();

    const className = panel()?.className ?? '';
    expect(className).toContain('motion-reduce:transition-none');
    expect(className).toContain('motion-reduce:animate-none');
  });

  it('emits closed when the projected close button (hlmSheetClose, labelled from copy) is clicked', async () => {
    await openDrawer();

    const closeBtn = query('[data-testid="crd-close-btn"]') as HTMLButtonElement | null;
    expect(closeBtn).toBeTruthy();
    expect(closeBtn?.getAttribute('aria-label')).toBe(copy.closeAriaLabel);
    closeBtn?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.closedCount).toBe(1);
    expect(panel()).toBeNull();
  });

  it('emits closed when the scrim is clicked', async () => {
    await openDrawer();

    const scrim = query('hlm-sheet-overlay');
    expect(scrim).toBeTruthy();
    scrim?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.closedCount).toBe(1);
    expect(panel()).toBeNull();
  });

  it('emits closed on Escape', async () => {
    await openDrawer();

    panel()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.closedCount).toBe(1);
    expect(panel()).toBeNull();
  });

  it('does NOT render the sheet-content built-in close button (showCloseButton=false, single close surface)', async () => {
    await openDrawer();

    // The built-in close renders `<span class="sr-only">Close</span>` — our own close button never does.
    const builtIn = queryAll('[data-slot="sheet-close"] span.sr-only').find(el => el.textContent === 'Close');
    expect(builtIn).toBeUndefined();
  });

  describe('CRD-R-2: header sentence', () => {
    it('renders the non-bilateral sentence with codes in mono', async () => {
      host.headerParts.set({
        lead: 'Priya Raghavan',
        requesterCode: 'SP06',
        verb: copy.header.verb,
        responderCode: 'SP01',
        tail: copy.header.tail,
        resultCode: '9377',
        resultTitle: 'Some result title'
      });
      await openDrawer();

      const sentence = query('[data-testid="crd-header-sentence"]');
      const text = (sentence?.textContent ?? '').replace(/\s+/g, ' ').trim();
      expect(text).toBe('Priya Raghavan from SP06 has asked SP01 to contribute to result 9377 – Some result title');

      const monoEls = sentence?.querySelectorAll('.font-mono') ?? [];
      const monoTexts = Array.from(monoEls).map(el => el.textContent?.trim());
      expect(monoTexts).toEqual(['SP06', 'SP01', '9377']);
    });

    it('renders the bilateral sentence with no invented requester name', async () => {
      // CRD-T-4 / CRD-R-2: notification-item's drawerHeader() leaves requesterCode empty for
      // bilateral requests — this host fixture mirrors that, exactly as the real caller does.
      host.headerParts.set({
        lead: `${copy.header.bilateralLeadPrefix} CIAT`,
        requesterCode: '',
        verb: copy.header.bilateralVerb,
        responderCode: 'SP01',
        tail: copy.header.bilateralTail,
        resultCode: '9377',
        resultTitle: 'Some result title'
      });
      await openDrawer();

      const sentence = query('[data-testid="crd-header-sentence"]');
      const text = (sentence?.textContent ?? '').replace(/\s+/g, ' ').trim();
      expect(text).toBe('Center CIAT has reported a contribution to SP01 for result 9377 – Some result title');
      expect(text).not.toContain('undefined');
      expect(text).not.toContain('from');
    });
  });

  describe('CRD-R-3: Result card', () => {
    it('emits resultActivated when the RESULT card is activated', async () => {
      host.resultCode.set('9377');
      host.resultTitle.set('Some result title');
      await openDrawer();

      const card = query('[data-testid="crd-result-card"]') as HTMLButtonElement | null;
      expect(card?.textContent).toContain('9377');
      expect(card?.textContent).toContain('Some result title');

      card?.click();
      expect(host.resultActivatedCount).toBe(1);
    });
  });

  describe('CRD-R-4: "Where it contributes"', () => {
    it('renders one table with all 7 labels and a muted dash in every value when reviewRows is empty (no review data)', async () => {
      host.reviewRows.set([]);
      await openDrawer();

      // BUT the section itself must not be hidden.
      expect(query('[data-testid="crd-review-section"]')).toBeTruthy();

      const labels = queryAll('[data-testid="crd-review-label"]').map(el => el.textContent?.trim());
      expect(labels).toEqual([
        copy.fieldLabels.level,
        copy.fieldLabels.highLevelOutputOutcome,
        copy.fieldLabels.outcomeStatement,
        copy.fieldLabels.indicatorTypology,
        copy.fieldLabels.unitOfMeasurement,
        copy.fieldLabels.target,
        copy.fieldLabels.contributionTarget
      ]);
      expect(labels.length).not.toBeLessThan(7);

      const values = queryAll('[data-testid="crd-review-value"]').map(el => el.textContent?.trim());
      expect(values.every(v => v === copy.dashValue)).toBe(true);
    });

    it('renders one table, with mono + tabular-nums on Target/Contribution target, for a request with one review entry', async () => {
      host.reviewRows.set([buildReviewRow({ level: 'Output', target: '100', contributionTarget: '40' })]);
      await openDrawer();

      const tables = queryAll('[data-testid="crd-review-table"]');
      expect(tables.length).toBe(1);

      const values = queryAll('[data-testid="crd-review-value"]');
      const targetValue = values[values.length - 2];
      expect(targetValue.className).toContain('font-mono');
      expect(targetValue.className).toContain('tabular-nums');
    });

    it('renders two tables (not one) for two review entries, in server order', async () => {
      host.reviewRows.set([buildReviewRow({ level: 'Output' }), buildReviewRow({ level: 'Outcome' })]);
      await openDrawer();

      const tables = queryAll('[data-testid="crd-review-table"]');
      expect(tables.length).toBe(2);
      expect(tables[0].textContent).toContain('Output');
      expect(tables[1].textContent).toContain('Outcome');
    });

    it('long text (CRD-R-4 Long text): a value past the clamp threshold gets line-clamp-3 + an inline Show more toggle', async () => {
      const longStatement = 'a'.repeat(200);
      host.reviewRows.set([buildReviewRow({ outcomeStatement: longStatement })]);
      await openDrawer();

      const values = queryAll('[data-testid="crd-review-value"]');
      const statementValue = values[2];
      expect(statementValue.className).toContain('line-clamp-3');

      const toggle = query('[data-testid="crd-review-toggle"]') as HTMLButtonElement | null;
      expect(toggle).toBeTruthy();
      expect(toggle?.textContent?.trim()).toBe(copy.showMore);

      toggle?.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const expandedValue = queryAll('[data-testid="crd-review-value"]')[2];
      expect(expandedValue.className).not.toContain('line-clamp-3');
      expect(query('[data-testid="crd-review-toggle"]')?.textContent?.trim()).toBe(copy.showLess);
    });

    it('a short dash value gets no Show more toggle', async () => {
      host.reviewRows.set([buildReviewRow()]);
      await openDrawer();

      expect(query('[data-testid="crd-review-toggle"]')).toBeNull();
    });

    it('DISQUALIFIER falsifier (min fix): the clamp is present only where the toggle is — a short value gets NEITHER line-clamp-3 NOR a toggle, a long value gets BOTH', async () => {
      const shortStatement = 'a'.repeat(50);
      const longStatement = 'a'.repeat(200);
      host.reviewRows.set([buildReviewRow({ level: shortStatement, outcomeStatement: longStatement })]);
      await openDrawer();

      const values = queryAll('[data-testid="crd-review-value"]');
      const shortValue = values[0];
      const longValue = values[2];

      expect(shortValue.className).not.toContain('line-clamp-3');
      expect(longValue.className).toContain('line-clamp-3');

      const toggles = queryAll('[data-testid="crd-review-toggle"]');
      expect(toggles.length).toBe(1);
    });
  });

  describe('CRD-R-6/R-8: footer — decide mode, disabled/busy/blocked/helper', () => {
    it('DISQUALIFIER falsifier: acceptDisabled = true actually disables the Accept button (does not leave it clickable)', async () => {
      // `[disabled]` on `button[hlmBtn]` resolves to `BrnButton`'s hostDirectives-forwarded input,
      // which the shared Jest Brain stub (`tests/mocks/spartanBrainMock.ts`, out of this task's
      // scope) never reflects onto the native DOM attribute — the real `BrnButton` does, via its
      // own `[attr.disabled]` host binding. So the falsifier is proven at the emission boundary
      // (a disabled click never emits), which the component's own guard makes true either way.
      host.acceptDisabled.set(true);
      await openDrawer();

      const acceptBtn = query('[data-testid="crd-accept-btn"]') as HTMLButtonElement | null;
      acceptBtn?.click();
      expect(host.acceptClickedCount).toBe(0);
    });

    it('declineDisabled = true disables the Decline button', async () => {
      host.declineDisabled.set(true);
      await openDrawer();

      const declineBtn = query('[data-testid="crd-decline-btn"]') as HTMLButtonElement | null;
      declineBtn?.click();
      expect(host.declineClickedCount).toBe(0);
    });

    it('Busy: acceptBusy shows a spinner on Accept and declineBusy shows one on Decline', async () => {
      host.acceptBusy.set(true);
      host.declineBusy.set(true);
      await openDrawer();

      expect(query('[data-testid="crd-accept-btn"] ng-icon[name="lucideLoaderCircle"]')).toBeTruthy();
      expect(query('[data-testid="crd-decline-btn"] ng-icon[name="lucideLoaderCircle"]')).toBeTruthy();
    });

    it('Blocked: a non-null blockedReason renders the reason line and ties it via aria-describedby to Accept and Decline', async () => {
      host.blockedReason.set(copy.footer.blockedGenericReason);
      await openDrawer();

      const reason = query('[data-testid="crd-blocked-reason"]');
      expect(reason?.textContent?.trim()).toBe(copy.footer.blockedGenericReason);

      const acceptBtn = query('[data-testid="crd-accept-btn"]') as HTMLButtonElement | null;
      const declineBtn = query('[data-testid="crd-decline-btn"]') as HTMLButtonElement | null;
      expect(acceptBtn?.getAttribute('aria-describedby')).toContain('crd-blocked-reason');
      expect(declineBtn?.getAttribute('aria-describedby')).toBe('crd-blocked-reason');

      // See the acceptDisabled/declineDisabled tests above for why this is proven at the
      // emission boundary rather than the native `disabled` attribute under the Jest Brain stub.
      acceptBtn?.click();
      declineBtn?.click();
      expect(host.acceptClickedCount).toBe(0);
      expect(host.declineClickedCount).toBe(0);
    });

    it('DISQUALIFIER falsifier: blockedReason = null renders NO reason element (CRD-R-8 "the footer shows one reason line" only when blocked)', async () => {
      host.blockedReason.set(null);
      await openDrawer();

      expect(query('[data-testid="crd-blocked-reason"]')).toBeNull();

      const acceptBtn = query('[data-testid="crd-accept-btn"]') as HTMLButtonElement | null;
      const declineBtn = query('[data-testid="crd-decline-btn"]') as HTMLButtonElement | null;
      expect(acceptBtn?.hasAttribute('aria-describedby')).toBe(false);
      expect(declineBtn?.hasAttribute('aria-describedby')).toBe(false);
    });

    it('Incomplete mapping helper: a non-null acceptHelper renders and is tied via aria-describedby to Accept', async () => {
      host.acceptHelper.set(copy.footer.acceptHelperIncompleteMapping);
      await openDrawer();

      const helper = query('[data-testid="crd-accept-helper"]');
      expect(helper?.textContent?.trim()).toBe(copy.footer.acceptHelperIncompleteMapping);

      const acceptBtn = query('[data-testid="crd-accept-btn"]') as HTMLButtonElement | null;
      expect(acceptBtn?.getAttribute('aria-describedby')).toContain('crd-accept-helper');
    });

    it('acceptHelper = null renders NO helper element', async () => {
      host.acceptHelper.set(null);
      await openDrawer();

      expect(query('[data-testid="crd-accept-helper"]')).toBeNull();
    });

    it('emits acceptClicked / declineClicked when the footer buttons are activated', async () => {
      await openDrawer();

      (query('[data-testid="crd-accept-btn"]') as HTMLButtonElement)?.click();
      (query('[data-testid="crd-decline-btn"]') as HTMLButtonElement)?.click();

      expect(host.acceptClickedCount).toBe(1);
      expect(host.declineClickedCount).toBe(1);
    });
  });

  describe('CRD-R-7: footer — confirm-decline mode', () => {
    it('DISQUALIFIER falsifier: mode = "confirm-decline" does NOT show Accept contribution', async () => {
      host.mode.set('confirm-decline');
      await openDrawer();

      expect(query('[data-testid="crd-accept-btn"]')).toBeNull();
      expect(query('[data-testid="crd-decline-btn"]')).toBeNull();
      expect(query('[data-testid="crd-confirm-decline-btn"]')).toBeTruthy();
      expect(query('[data-testid="crd-decline-confirm-title"]')?.textContent?.trim()).toBe(copy.footer.declineConfirmTitle);
    });

    it('Cancel emits declineCancelled and nothing else', async () => {
      host.mode.set('confirm-decline');
      await openDrawer();

      (query('[data-testid="crd-cancel-btn"]') as HTMLButtonElement)?.click();

      expect(host.declineCancelledCount).toBe(1);
      expect(host.declineConfirmedCount).toBe(0);
    });

    it('Confirm decline emits declineConfirmed', async () => {
      host.mode.set('confirm-decline');
      await openDrawer();

      (query('[data-testid="crd-confirm-decline-btn"]') as HTMLButtonElement)?.click();

      expect(host.declineConfirmedCount).toBe(1);
    });
  });

  describe('CRD-R-10: Bilateral row accept — scroll Align into view', () => {
    it('scrolls the projected [crdAlign] slot into view when focusAlign is true on open', async () => {
      const scrollIntoViewSpy = jest.fn();
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = scrollIntoViewSpy;

      try {
        host.focusAlign.set(true);
        await openDrawer();
        // The scroll is deferred a microtask past the sheet's own portal/state effects; give the
        // zone one more turn to flush it.
        await Promise.resolve();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(scrollIntoViewSpy).toHaveBeenCalled();
      } finally {
        Element.prototype.scrollIntoView = original;
      }
    });

    it('does NOT scroll when focusAlign is false', async () => {
      const scrollIntoViewSpy = jest.fn();
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = scrollIntoViewSpy;

      try {
        host.focusAlign.set(false);
        await openDrawer();

        expect(scrollIntoViewSpy).not.toHaveBeenCalled();
      } finally {
        Element.prototype.scrollIntoView = original;
      }
    });
  });
});
