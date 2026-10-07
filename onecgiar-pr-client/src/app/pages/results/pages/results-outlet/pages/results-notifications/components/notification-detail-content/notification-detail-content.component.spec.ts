// @akili-spec notifications/detail-side-panel (DSP-T-3)
//
// DSP-T-3 relocated the drawer's body/footer markup and logic out of
// `../contribution-request-drawer/contribution-request-drawer.component.ts` into this new,
// standalone, presentational component. Every test below is MOVED 1:1 from
// `contribution-request-drawer.component.spec.ts` (old describe → this file, same assertions),
// adapted only for the removal of the `open`/sheet-visibility input (this component has no `open`
// of its own — the shell that now projects it owns that; see its own spec) and for the renamed
// host harness helper (`openDrawer()` → `render()`, since there is no drawer to open here any more).
// No assertion, fixture shape, or expected value was changed beyond that mechanical adaptation.
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  NotificationDetailContentComponent,
  ContributionRequestDrawerChainState,
  ContributionRequestDrawerChip,
  ContributionRequestDrawerGridField,
  ContributionRequestDrawerHeaderParts,
  ContributionRequestDrawerMode,
  ContributionRequestDrawerReviewField
} from './notification-detail-content.component';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../../internationalization/contribution-request-drawer.copy';
import type { ApprovalChainDto } from '../../../../../../../../shared/services/api/results-api.service';

@Component({
  standalone: true,
  imports: [NotificationDetailContentComponent],
  template: `
    <app-notification-detail-content
      [headingId]="headingId()"
      [mode]="mode()"
      [title]="title()"
      [chips]="chips()"
      [headerParts]="headerParts()"
      [resultCode]="resultCode()"
      [resultTitle]="resultTitle()"
      [resultGrid]="resultGrid()"
      [chain]="chain()"
      [reviewRows]="reviewRows()"
      [acceptDisabled]="acceptDisabled()"
      [declineDisabled]="declineDisabled()"
      [acceptBusy]="acceptBusy()"
      [declineBusy]="declineBusy()"
      [blockedReason]="blockedReason()"
      [acceptHelper]="acceptHelper()"
      [focusAlign]="focusAlign()"
      [acceptLabel]="acceptLabel()"
      [showAlignSlot]="showAlignSlot()"
      (closed)="onClosed()"
      (resultActivated)="onResultActivated()"
      (acceptClicked)="onAcceptClicked()"
      (declineClicked)="onDeclineClicked()"
      (declineConfirmed)="onDeclineConfirmed()"
      (declineCancelled)="onDeclineCancelled()"
      (retryChain)="onRetryChain()"
    >
      <div crdAlign data-testid="align-slot">align content</div>
    </app-notification-detail-content>
  `
})
class HostComponent {
  readonly headingId = signal('crd-heading-test');
  readonly mode = signal<ContributionRequestDrawerMode>('decide');
  readonly title = signal('');
  readonly chips = signal<ContributionRequestDrawerChip[]>([]);
  readonly headerParts = signal<ContributionRequestDrawerHeaderParts | null>(null);
  readonly resultCode = signal('');
  readonly resultTitle = signal('');
  readonly resultGrid = signal<ContributionRequestDrawerGridField[]>([]);
  readonly chain = signal<ContributionRequestDrawerChainState>({ state: 'loading' });
  readonly reviewRows = signal<ContributionRequestDrawerReviewField[][]>([]);
  readonly acceptDisabled = signal(false);
  readonly declineDisabled = signal(false);
  readonly acceptBusy = signal(false);
  readonly declineBusy = signal(false);
  readonly blockedReason = signal<string | null>(null);
  readonly acceptHelper = signal<string | null>(null);
  readonly focusAlign = signal(false);
  readonly acceptLabel = signal<string | null>(null);
  readonly showAlignSlot = signal(true);

  closedCount = 0;
  resultActivatedCount = 0;
  acceptClickedCount = 0;
  declineClickedCount = 0;
  declineConfirmedCount = 0;
  declineCancelledCount = 0;
  retryChainCount = 0;

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

  onRetryChain(): void {
    this.retryChainCount++;
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

describe('NotificationDetailContentComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  function query(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  function queryAll(selector: string): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(selector));
  }

  /** Renamed from the old spec's `openDrawer()` — there is no drawer/open state here any more. */
  async function render(): Promise<void> {
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

  it('CRD-P-4 (jsdom-provable half): renders the projected [crdAlign] content inside the body', async () => {
    await render();

    const projected = query('[data-testid="align-slot"]');
    expect(projected).toBeTruthy();
    expect(projected?.textContent).toContain('align content');
    // Lives inside the content's scrolling body, not the header/footer.
    expect(query('[data-testid="crd-body"] [data-testid="align-slot"]')).toBeTruthy();
  });

  it('renders the h2 heading with the id passed via `headingId` (DSP-T-3: the shell\'s aria-labelledby target)', async () => {
    host.headingId.set('crd-heading-7');
    await render();

    const heading = query('h2');
    expect(heading?.id).toBe('crd-heading-7');
  });

  describe('PSR-T-9: kind-aware Accept label', () => {
    it('DISQUALIFIER falsifier / CRD zero-touch: acceptLabel = null (default) still shows "Accept contribution" exactly as before', async () => {
      await render();

      const acceptBtn = query('[data-testid="crd-accept-btn"]');
      expect(acceptBtn?.textContent?.trim()).toBe(copy.footer.acceptContribution);
    });

    it('a non-null acceptLabel overrides the footer Accept button text (e.g. "Accept as primary")', async () => {
      host.acceptLabel.set(copy.footer.acceptAsPrimary);
      await render();

      const acceptBtn = query('[data-testid="crd-accept-btn"]');
      expect(acceptBtn?.textContent?.trim()).toBe(copy.footer.acceptAsPrimary);
    });
  });

  describe('PSR-T-9: no ToC Align projection for primary requests (showAlignSlot)', () => {
    it('DISQUALIFIER falsifier / CRD zero-touch: showAlignSlot = true (default) still renders the projected [crdAlign] content', async () => {
      await render();

      expect(query('[data-testid="align-slot"]')).toBeTruthy();
    });

    it('Falsifier: showAlignSlot = false never renders the projected [crdAlign] content, even though it is projected', async () => {
      host.showAlignSlot.set(false);
      await render();

      expect(query('[data-testid="align-slot"]')).toBeNull();
    });
  });

  it('emits closed when the close button (crd-close-btn) is clicked (DSP-T-3: the sole close surface this component owns)', async () => {
    await render();

    const closeBtn = query('[data-testid="crd-close-btn"]') as HTMLButtonElement | null;
    expect(closeBtn).toBeTruthy();
    expect(closeBtn?.getAttribute('aria-label')).toBe(copy.closeAriaLabel);
    closeBtn?.click();

    expect(host.closedCount).toBe(1);
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
      await render();

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
      await render();

      const sentence = query('[data-testid="crd-header-sentence"]');
      const text = (sentence?.textContent ?? '').replace(/\s+/g, ' ').trim();
      expect(text).toBe('Center CIAT has reported a contribution to SP01 for result 9377 – Some result title');
      expect(text).not.toContain('undefined');
      expect(text).not.toContain('from');
    });

    it('PSR-T-9 (PSR-R-10, design.md §6.1 "Bilateral contributor request"): leadCode renders bold right after lead, and suffix renders after the result title', async () => {
      host.headerParts.set({
        lead: '',
        leadCode: 'SP09',
        requesterCode: '',
        verb: copy.header.bilateralContributorVerb,
        responderCode: 'SP12',
        tail: copy.header.bilateralContributorTail,
        resultCode: '9377',
        resultTitle: 'Some result title',
        suffix: `${copy.header.onBehalfOf} CIAT`
      });
      await render();

      const sentence = query('[data-testid="crd-header-sentence"]');
      const text = (sentence?.textContent ?? '').replace(/\s+/g, ' ').trim();
      expect(text).toBe(
        'SP09, as primary Science Program, has tagged SP12 as a contributing Science Program to result 9377 – Some result title on behalf of CIAT'
      );

      const monoEls = sentence?.querySelectorAll('.font-mono') ?? [];
      const monoTexts = Array.from(monoEls).map(el => el.textContent?.trim());
      expect(monoTexts).toEqual(['SP09', 'SP12', '9377']);
    });

    it('DISQUALIFIER falsifier / CRD zero-touch: omitting leadCode/suffix renders byte-identical to before (no extra whitespace, no "undefined")', async () => {
      host.headerParts.set({
        lead: 'Priya Raghavan',
        requesterCode: 'SP06',
        verb: copy.header.verb,
        responderCode: 'SP01',
        tail: copy.header.tail,
        resultCode: '9377',
        resultTitle: 'Some result title'
        // leadCode / suffix intentionally absent.
      });
      await render();

      const sentence = query('[data-testid="crd-header-sentence"]');
      const text = (sentence?.textContent ?? '').replace(/\s+/g, ' ').trim();
      expect(text).toBe('Priya Raghavan from SP06 has asked SP01 to contribute to result 9377 – Some result title');
      expect(text).not.toContain('undefined');
    });
  });

  describe('CRD-R-3: Result card', () => {
    it('emits resultActivated when the RESULT card is activated', async () => {
      host.resultCode.set('9377');
      host.resultTitle.set('Some result title');
      await render();

      const card = query('[data-testid="crd-result-card"]') as HTMLButtonElement | null;
      expect(card?.textContent).toContain('9377');
      expect(card?.textContent).toContain('Some result title');

      card?.click();
      expect(host.resultActivatedCount).toBe(1);
    });

    // DSP-T-9 Q-3 (design.md §6.3 RESULT card "one inline run", user-approved 2026-10-05): the code
    // must not sit alone on its own line — structurally, that means the button has no `flex`/
    // `flex-wrap` display (which would let the code and title wrap as separate flex items) and the
    // code stays `.font-mono` inline inside the same text run as the title. This is a structural
    // proxy, not visual proof — real wrapping fidelity is the Leader's browser recheck (T-9).
    it('DSP-T-9 Q-3: the RESULT link renders code + title as one inline run, not separate flex items', async () => {
      host.resultCode.set('9674');
      host.resultTitle.set('Influencing a long policy title that could wrap onto multiple lines');
      await render();

      const card = query('[data-testid="crd-result-card"]') as HTMLButtonElement | null;
      expect(card).toBeTruthy();
      // FALSIFIER: the pre-fix markup had `flex flex-wrap items-baseline` on this button — that
      // class combination is exactly what let the code wrap onto its own line, observed red before
      // the fix.
      expect(card?.className).not.toContain('flex');
      expect(card?.className).not.toContain('flex-wrap');

      const mono = card?.querySelector('.font-mono');
      expect(mono?.textContent?.trim()).toBe('9674');
      expect(card?.textContent?.replace(/\s+/g, ' ').trim()).toBe('9674 – Influencing a long policy title that could wrap onto multiple lines');
    });

    // Reviewer FAIL issue 3 (design.md §6.3 Metrics, "RESULT card"): the mockup shows the "RESULT"
    // label INSIDE the bordered card, above the link — not above/outside the card.
    it('Reviewer FAIL issue 3: the RESULT section h3 is a descendant of the card container', async () => {
      await render();

      const cardContainer = query('[data-testid="crd-result-card-container"]');
      const heading = Array.from(cardContainer?.querySelectorAll('h3') ?? []).find(h => h.textContent?.trim() === copy.sections.result);

      expect(cardContainer).toBeTruthy();
      expect(heading).toBeTruthy();
      expect(cardContainer?.contains(heading as Node)).toBe(true);
    });
  });

  describe('CRD-R-4: "Where it contributes"', () => {
    it('renders one table with all 7 labels and a muted dash in every value when reviewRows is empty (no review data)', async () => {
      host.reviewRows.set([]);
      await render();

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
      await render();

      const tables = queryAll('[data-testid="crd-review-table"]');
      expect(tables.length).toBe(1);

      const values = queryAll('[data-testid="crd-review-value"]');
      const targetValue = values[values.length - 2];
      expect(targetValue.className).toContain('font-mono');
      expect(targetValue.className).toContain('tabular-nums');
    });

    it('renders two tables (not one) for two review entries, in server order', async () => {
      host.reviewRows.set([buildReviewRow({ level: 'Output' }), buildReviewRow({ level: 'Outcome' })]);
      await render();

      const tables = queryAll('[data-testid="crd-review-table"]');
      expect(tables.length).toBe(2);
      expect(tables[0].textContent).toContain('Output');
      expect(tables[1].textContent).toContain('Outcome');
    });

    it('long text (CRD-R-4 Long text): a value past the clamp threshold gets line-clamp-3 + an inline Show more toggle', async () => {
      const longStatement = 'a'.repeat(200);
      host.reviewRows.set([buildReviewRow({ outcomeStatement: longStatement })]);
      await render();

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
      await render();

      expect(query('[data-testid="crd-review-toggle"]')).toBeNull();
    });

    it('DISQUALIFIER falsifier (min fix): the clamp is present only where the toggle is — a short value gets NEITHER line-clamp-3 NOR a toggle, a long value gets BOTH', async () => {
      const shortStatement = 'a'.repeat(50);
      const longStatement = 'a'.repeat(200);
      host.reviewRows.set([buildReviewRow({ level: shortStatement, outcomeStatement: longStatement })]);
      await render();

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
      await render();

      const acceptBtn = query('[data-testid="crd-accept-btn"]') as HTMLButtonElement | null;
      acceptBtn?.click();
      expect(host.acceptClickedCount).toBe(0);
    });

    it('declineDisabled = true disables the Decline button', async () => {
      host.declineDisabled.set(true);
      await render();

      const declineBtn = query('[data-testid="crd-decline-btn"]') as HTMLButtonElement | null;
      declineBtn?.click();
      expect(host.declineClickedCount).toBe(0);
    });

    it('Busy: acceptBusy shows a spinner on Accept and declineBusy shows one on Decline', async () => {
      host.acceptBusy.set(true);
      host.declineBusy.set(true);
      await render();

      expect(query('[data-testid="crd-accept-btn"] ng-icon[name="lucideLoaderCircle"]')).toBeTruthy();
      expect(query('[data-testid="crd-decline-btn"] ng-icon[name="lucideLoaderCircle"]')).toBeTruthy();
    });

    it('Blocked: a non-null blockedReason renders the reason line and ties it via aria-describedby to Accept and Decline', async () => {
      host.blockedReason.set(copy.footer.blockedGenericReason);
      await render();

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
      await render();

      expect(query('[data-testid="crd-blocked-reason"]')).toBeNull();

      const acceptBtn = query('[data-testid="crd-accept-btn"]') as HTMLButtonElement | null;
      const declineBtn = query('[data-testid="crd-decline-btn"]') as HTMLButtonElement | null;
      expect(acceptBtn?.hasAttribute('aria-describedby')).toBe(false);
      expect(declineBtn?.hasAttribute('aria-describedby')).toBe(false);
    });

    it('Incomplete mapping helper: a non-null acceptHelper renders and is tied via aria-describedby to Accept', async () => {
      host.acceptHelper.set(copy.footer.acceptHelperIncompleteMapping);
      await render();

      const helper = query('[data-testid="crd-accept-helper"]');
      expect(helper?.textContent?.trim()).toBe(copy.footer.acceptHelperIncompleteMapping);

      const acceptBtn = query('[data-testid="crd-accept-btn"]') as HTMLButtonElement | null;
      expect(acceptBtn?.getAttribute('aria-describedby')).toContain('crd-accept-helper');
    });

    it('acceptHelper = null renders NO helper element', async () => {
      host.acceptHelper.set(null);
      await render();

      expect(query('[data-testid="crd-accept-helper"]')).toBeNull();
    });

    it('emits acceptClicked / declineClicked when the footer buttons are activated', async () => {
      await render();

      (query('[data-testid="crd-accept-btn"]') as HTMLButtonElement)?.click();
      (query('[data-testid="crd-decline-btn"]') as HTMLButtonElement)?.click();

      expect(host.acceptClickedCount).toBe(1);
      expect(host.declineClickedCount).toBe(1);
    });
  });

  describe('CRD-R-7: footer — confirm-decline mode', () => {
    it('DISQUALIFIER falsifier: mode = "confirm-decline" does NOT show Accept contribution', async () => {
      host.mode.set('confirm-decline');
      await render();

      expect(query('[data-testid="crd-accept-btn"]')).toBeNull();
      expect(query('[data-testid="crd-decline-btn"]')).toBeNull();
      expect(query('[data-testid="crd-confirm-decline-btn"]')).toBeTruthy();
      expect(query('[data-testid="crd-decline-confirm-title"]')?.textContent?.trim()).toBe(copy.footer.declineConfirmTitle);
    });

    it('Cancel emits declineCancelled and nothing else', async () => {
      host.mode.set('confirm-decline');
      await render();

      (query('[data-testid="crd-cancel-btn"]') as HTMLButtonElement)?.click();

      expect(host.declineCancelledCount).toBe(1);
      expect(host.declineConfirmedCount).toBe(0);
    });

    it('Confirm decline emits declineConfirmed', async () => {
      host.mode.set('confirm-decline');
      await render();

      (query('[data-testid="crd-confirm-decline-btn"]') as HTMLButtonElement)?.click();

      expect(host.declineConfirmedCount).toBe(1);
    });
  });

  describe('CRD-R-10: Bilateral row accept — scroll Align into view', () => {
    it('scrolls the projected [crdAlign] slot into view when focusAlign is true', async () => {
      const scrollIntoViewSpy = jest.fn();
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = scrollIntoViewSpy;

      try {
        host.focusAlign.set(true);
        await render();
        // The scroll is deferred a microtask past the component's own constructor effect; give the
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
        await render();

        expect(scrollIntoViewSpy).not.toHaveBeenCalled();
      } finally {
        Element.prototype.scrollIntoView = original;
      }
    });
  });

  // DSP-T-4 rewrites NOTIF-T-4/NOTIF-T-14's `view`-mode-only metadata grid tests below — the grid
  // itself is gone (DD-6): status/requestKind moved to `chips()`/`title()`, and the RESULT grid now
  // renders for every mode, never omitting a label (a missing value is `copy.dashValue`, muted).
  describe('DSP-T-4: header title, chips row, RESULT grid (supersedes NOTIF-T-4/T-14)', () => {
    it('DISQUALIFIER falsifier: `view` mode renders no footer at all — no Accept/Decline, no confirm-decline', async () => {
      host.mode.set('view');
      await render();

      expect(query('[data-testid="crd-footer"]')).toBeNull();
      expect(query('[data-testid="crd-accept-btn"]')).toBeNull();
      expect(query('[data-testid="crd-decline-btn"]')).toBeNull();
      expect(query('[data-testid="crd-confirm-decline-btn"]')).toBeNull();
      expect(query('[data-testid="crd-cancel-btn"]')).toBeNull();
    });

    it('regression: `decide` mode is unaffected by `view` mode — still shows the Accept/Decline footer exactly as before', async () => {
      host.mode.set('decide');
      await render();

      expect(query('[data-testid="crd-footer"]')).toBeTruthy();
      expect(query('[data-testid="crd-accept-btn"]')).toBeTruthy();
      expect(query('[data-testid="crd-decline-btn"]')).toBeTruthy();
    });

    it('renders the `title` input in the h2, falling back to copy.title when empty', async () => {
      host.title.set('');
      await render();
      expect(query('h2')?.textContent?.trim()).toBe(copy.title);

      host.title.set('Primary program request');
      await render();
      expect(query('h2')?.textContent?.trim()).toBe('Primary program request');
    });

    describe('chips row', () => {
      it('renders every chip passed, in order, with only the funding chip outlined', async () => {
        host.chips.set([
          { text: 'Needs your decision', pill: true },
          { text: 'W1/W2', outlined: true, pill: true },
          { text: 'Output · Innovation Development' },
          { text: '25 Sep 2026' }
        ]);
        await render();

        const chipEls = queryAll('[data-testid="crd-chip"]');
        expect(chipEls.map(el => el.textContent?.trim())).toEqual([
          'Needs your decision',
          'W1/W2',
          'Output · Innovation Development',
          '25 Sep 2026'
        ]);
        expect(chipEls[1].getAttribute('data-variant')).toBe('outline');
        expect(chipEls[0].getAttribute('data-variant')).not.toBe('outline');
      });

      it('Falsifier: no outlined chip renders at all when the caller never includes a funding chip (e.g. a row with no funding window)', async () => {
        host.chips.set([{ text: 'Needs your decision', pill: true }]);
        await render();

        const chipEls = queryAll('[data-testid="crd-chip"]');
        expect(chipEls.some(el => el.getAttribute('data-variant') === 'outline')).toBe(false);
      });

      it('renders no chips row at all when chips() is empty', async () => {
        host.chips.set([]);
        await render();

        expect(query('[data-testid="crd-chips-row"]')).toBeNull();
      });

      // DSP-T-9 Q-2 (design.md §6.3 "Chips row", user-approved 2026-10-05): only status/funding are
      // pills; level · type and the date render as plain muted text, same font size. FALSIFIER:
      // rendering every chip through the pill branch (dropping the `chip.pill` check) makes every
      // `data-chip-kind` read "pill" — observed red before the fix.
      it('DSP-T-9 Q-2: only pill chips (status, funding) render as hlmBadge pills; level·type and date render as plain text', async () => {
        host.chips.set([
          { text: 'Needs your decision', pill: true },
          { text: 'W1/W2', outlined: true, pill: true },
          { text: 'Output · Innovation Development' },
          { text: '25 Sep 2026' }
        ]);
        await render();

        const chipEls = queryAll('[data-testid="crd-chip"]');
        const kinds = chipEls.map(el => el.getAttribute('data-chip-kind'));
        expect(kinds).toEqual(['pill', 'pill', 'text', 'text']);

        // The plain-text chips carry no pill chrome (no hlmBadge host, no rounded-pill class).
        expect(chipEls[2].getAttribute('data-variant')).toBeNull();
        expect(chipEls[3].getAttribute('data-variant')).toBeNull();
        expect(chipEls[2].className).not.toContain('rounded-full');
        expect(chipEls[3].className).not.toContain('rounded-full');
      });
    });

    describe('RESULT grid (DD-6/DD-7)', () => {
      function buildGrid(overrides: Partial<Record<string, string>> = {}): ContributionRequestDrawerGridField[] {
        const dash = copy.dashValue;
        return [
          { label: copy.resultGridLabels.reportingCenter, value: overrides.reportingCenter ?? dash },
          { label: copy.resultGridLabels.resultType, value: overrides.resultType ?? dash },
          { label: copy.resultGridLabels.primaryProgram, value: overrides.primaryProgram ?? dash, mono: true },
          { label: copy.resultGridLabels.contributingPrograms, value: overrides.contributingPrograms ?? dash, mono: true },
          { label: copy.resultGridLabels.submittedBy, value: overrides.submittedBy ?? dash },
          { label: copy.resultGridLabels.phase, value: overrides.phase ?? dash }
        ];
      }

      it('Falsifier: a fixture with no reporting center still renders the "Reporting center" label, with a muted dash — never dropped', async () => {
        host.resultGrid.set(buildGrid());
        await render();

        const labels = queryAll('[data-testid="crd-result-grid-label"]').map(el => el.textContent?.trim());
        expect(labels).toContain(copy.resultGridLabels.reportingCenter);

        const values = queryAll('[data-testid="crd-result-grid-value"]');
        expect(values[0].textContent?.trim()).toBe(copy.dashValue);
        expect(values[0].className).toContain('text-ink-muted');
      });

      it('Falsifier: renders exactly 6 cells in the fixed order Reporting center → Result type → Primary SP → Contributing programs → Submitted by → Phase', async () => {
        host.resultGrid.set(
          buildGrid({
            reportingCenter: 'CIAT',
            resultType: 'Output · Innovation Development',
            primaryProgram: 'SP04',
            contributingPrograms: 'SP01, SP07',
            submittedBy: 'Samuel Otieno',
            phase: 'Reporting 2026 - P25'
          })
        );
        await render();

        const labels = queryAll('[data-testid="crd-result-grid-label"]').map(el => el.textContent?.trim());
        expect(labels).toEqual([
          copy.resultGridLabels.reportingCenter,
          copy.resultGridLabels.resultType,
          copy.resultGridLabels.primaryProgram,
          copy.resultGridLabels.contributingPrograms,
          copy.resultGridLabels.submittedBy,
          copy.resultGridLabels.phase
        ]);
        expect(labels.length).toBe(6);

        const values = queryAll('[data-testid="crd-result-grid-value"]').map(el => el.textContent?.trim());
        expect(values).toEqual(['CIAT', 'Output · Innovation Development', 'SP04', 'SP01, SP07', 'Samuel Otieno', 'Reporting 2026 - P25']);
      });

      it('Falsifier: the Contributing programs cell shows a skeleton — not a dash or a value — while loading', async () => {
        const grid = buildGrid();
        grid[3] = { ...grid[3], loading: true };
        host.resultGrid.set(grid);
        await render();

        expect(query('[data-testid="crd-result-grid-skeleton"]')).toBeTruthy();
        // Only the loading cell is suppressed — the other 5 still render a plain value span.
        expect(queryAll('[data-testid="crd-result-grid-value"]').length).toBe(5);
      });

      it('a mono field renders font-mono (Primary SP, Contributing programs), a plain field does not', async () => {
        host.resultGrid.set(buildGrid({ primaryProgram: 'SP04', contributingPrograms: 'SP01' }));
        await render();

        const values = queryAll('[data-testid="crd-result-grid-value"]');
        expect(values[2].className).toContain('font-mono');
        expect(values[3].className).toContain('font-mono');
        expect(values[0].className).not.toContain('font-mono');
      });

      it('renders no RESULT grid cells at all when resultGrid() is empty', async () => {
        host.resultGrid.set([]);
        await render();

        expect(queryAll('[data-testid="crd-result-grid-label"]').length).toBe(0);
      });
    });

    it('reuses the header sentence and RESULT card link unchanged alongside the new title/chips/grid', async () => {
      host.mode.set('view');
      host.title.set('Contribution request');
      host.resultCode.set('9377');
      host.resultTitle.set('Some result title');
      host.headerParts.set({
        lead: 'Priya Raghavan',
        requesterCode: 'SP06',
        verb: copy.header.verb,
        responderCode: 'SP01',
        tail: copy.header.tail,
        resultCode: '9377',
        resultTitle: 'Some result title'
      });
      await render();

      const card = query('[data-testid="crd-result-card"]');
      expect(card?.textContent).toContain('9377');
      expect(card?.textContent).toContain('Some result title');

      const sentence = query('[data-testid="crd-header-sentence"]');
      expect((sentence?.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
        'Priya Raghavan from SP06 has asked SP01 to contribute to result 9377 – Some result title'
      );
    });

    it('omits the "Where it contributes" section entirely in `view` mode when there is no review data (no dash-fallback placeholder)', async () => {
      host.mode.set('view');
      host.reviewRows.set([]);
      await render();

      expect(query('[data-testid="crd-review-section"]')).toBeNull();
    });

    it('still renders "Where it contributes" in `view` mode when real review data is present', async () => {
      host.mode.set('view');
      host.reviewRows.set([buildReviewRow({ level: 'Output' })]);
      await render();

      expect(query('[data-testid="crd-review-section"]')).toBeTruthy();
      const tables = queryAll('[data-testid="crd-review-table"]');
      expect(tables.length).toBe(1);
    });

    it('renders the labelled close control (crd-close-btn) in `view` mode, same as `decide` mode', async () => {
      host.mode.set('view');
      await render();

      const closeBtn = query('[data-testid="crd-close-btn"]') as HTMLButtonElement | null;
      expect(closeBtn).toBeTruthy();
      expect(closeBtn?.getAttribute('aria-label')).toBe(copy.closeAriaLabel);
    });

    it('emits closed exactly once when the close button is clicked in `view` mode (no footer to intercept it)', async () => {
      host.mode.set('view');
      await render();

      const closeBtn = query('[data-testid="crd-close-btn"]') as HTMLButtonElement | null;
      closeBtn?.click();

      expect(host.closedCount).toBe(1);
    });
  });

  // DSP-T-5 (design.md §6.2 "chain", §6.3 "Chain step", DSP-R-8/AC-6/AC-7): the APPROVAL CHAIN
  // section. Fixture = the mockup data (result 9400) verbatim from DSP-R-8's "Mixed statuses"
  // scenario / DSP-AC-6: Samuel Otieno submitted 25 Sep 2026; primary SP04 accepted; SP01 pending
  // + the viewer's own program; SP07 accepted by Marta Kowalski.
  describe('DSP-T-5: APPROVAL CHAIN', () => {
    function buildMockupChain(): ApprovalChainDto {
      return {
        result_id: 9400,
        submission: {
          state: 'submitted',
          result_status_id: 6,
          result_status_name: 'Approved',
          actor_name: 'Samuel Otieno',
          date: '2026-09-25T10:00:00.000Z'
        },
        steps: [
          {
            initiative_id: 4,
            official_code: 'SP04',
            short_name: 'Multifunctional Landscapes',
            name: 'Multifunctional Landscapes',
            role: 'primary',
            status: 'accepted',
            actor_name: 'Samuel Otieno',
            date: '2026-09-25T10:00:00.000Z',
            is_viewer_program: false
          },
          {
            initiative_id: 1,
            official_code: 'SP01',
            short_name: 'Breeding for Tomorrow',
            name: 'Breeding for Tomorrow',
            role: 'contributor',
            status: 'pending',
            actor_name: null,
            date: null,
            is_viewer_program: true
          },
          {
            initiative_id: 7,
            official_code: 'SP07',
            short_name: 'Policy Innovations',
            name: 'Policy Innovations',
            role: 'contributor',
            status: 'accepted',
            actor_name: 'Marta Kowalski',
            date: '2026-09-25T10:00:00.000Z',
            is_viewer_program: false
          }
        ]
      };
    }

    it('renders a skeleton (never the steps or the error UI) while loading', async () => {
      host.chain.set({ state: 'loading' });
      await render();

      expect(query('[data-testid="crd-chain-skeleton"]')).toBeTruthy();
      expect(query('[data-testid="crd-chain-error"]')).toBeNull();
      expect(queryAll('[data-testid="crd-chain-step"]').length).toBe(0);
    });

    describe('mockup fixture (DSP-AC-6, result 9400)', () => {
      it('Falsifier: renders the 4 steps in order, with the exact step texts/pills from DSP-R-8\'s main scenario', async () => {
        host.chain.set({ state: 'ok', data: buildMockupChain() });
        await render();

        const steps = queryAll('[data-testid="crd-chain-step"]');
        expect(steps.length).toBe(4);

        const names = steps.map(s => s.querySelector('[data-testid="crd-chain-step-name"]')?.textContent?.trim());
        expect(names).toEqual([copy.chain.programSubmission, 'SP04 Multifunctional Landscapes', 'SP01 Breeding for Tomorrow', 'SP07 Policy Innovations']);

        const pills = steps.map(s => s.querySelector('[data-testid="crd-chain-step-pill"]')?.textContent?.trim());
        expect(pills).toEqual([copy.chain.submittedPill, copy.chain.acceptedPill, copy.chain.awaitingDecisionPill, copy.chain.acceptedPill]);

        const subtitles = steps.map(s => s.querySelector('[data-testid="crd-chain-step-subtitle"]')?.textContent?.trim() ?? null);
        expect(subtitles).toEqual([
          copy.chain.submittedBy('Samuel Otieno', '25 Sep 2026'),
          copy.chain.actorAndDate('Samuel Otieno', '25 Sep 2026'),
          copy.chain.contributingProgram,
          copy.chain.actorAndDate('Marta Kowalski', '25 Sep 2026')
        ]);
      });

      it('Falsifier: "Your program" renders ONLY on SP01 (the viewer\'s own step), never on SP04 (the primary)', async () => {
        host.chain.set({ state: 'ok', data: buildMockupChain() });
        await render();

        const steps = queryAll('[data-testid="crd-chain-step"]');
        const yourProgramFlags = steps.map(s => !!s.querySelector('[data-testid="crd-chain-step-your-program"]'));
        expect(yourProgramFlags).toEqual([false, false, true, false]);
      });

      // DSP-T-9 F-3 (user-approved 2026-10-05): real data (result 9637) showed the viewer's own
      // PRIMARY, ACCEPTED step mislabeled "Contributing program" (hiding its actor/date), because
      // the old gate was `is_viewer_program` alone. FALSIFIER: reverting the gate back to
      // `is_viewer_program` fails this — observed red before the fix.
      it('DSP-T-9 F-3: the viewer\'s own step shows actor · date, not "Contributing program", when it is accepted (not a pending contributor)', async () => {
        const chain = buildMockupChain();
        // SP04 is role:'primary', status:'accepted' — make it ALSO the viewer's own program.
        chain.steps[0] = { ...chain.steps[0], is_viewer_program: true };
        host.chain.set({ state: 'ok', data: chain });
        await render();

        const steps = queryAll('[data-testid="crd-chain-step"]');
        const sp04Subtitle = steps[1].querySelector('[data-testid="crd-chain-step-subtitle"]')?.textContent?.trim();
        expect(sp04Subtitle).toBe(copy.chain.actorAndDate('Samuel Otieno', '25 Sep 2026'));
        expect(sp04Subtitle).not.toBe(copy.chain.contributingProgram);

        // "Your program" (the brand label) still renders for SP04 — only the subtitle gate changed.
        expect(steps[1].querySelector('[data-testid="crd-chain-step-your-program"]')).toBeTruthy();
      });

      it('DSP-T-5 rework attempt 2 (Reviewer FAIL issue 2): only the program CODE is mono, never the name — the submission step has no mono element at all', async () => {
        host.chain.set({ state: 'ok', data: buildMockupChain() });
        await render();

        const steps = queryAll('[data-testid="crd-chain-step"]');

        // Submission step: no code at all, so no `.font-mono` element — the whole name stays plain.
        const submissionMono = steps[0].querySelectorAll('[data-testid="crd-chain-step-name"] .font-mono');
        expect(submissionMono.length).toBe(0);
        expect(steps[0].querySelector('[data-testid="crd-chain-step-name"]')?.textContent?.trim()).toBe(copy.chain.programSubmission);

        // Program steps: exactly one mono element, containing ONLY the code — never the program name.
        const programMono = steps[1].querySelectorAll('[data-testid="crd-chain-step-name"] .font-mono');
        expect(programMono.length).toBe(1);
        expect(programMono[0].textContent?.trim()).toBe('SP04');
        expect(programMono[0].textContent?.trim()).not.toContain('Multifunctional Landscapes');

        const fullName = steps[1].querySelector('[data-testid="crd-chain-step-name"]')?.textContent?.replace(/\s+/g, ' ').trim();
        expect(fullName).toBe('SP04 Multifunctional Landscapes');
      });

      it('completed/pending/declined steps show a distinct icon each — a declined step never renders the same icon as a pending one', async () => {
        const chain = buildMockupChain();
        chain.steps[1] = { ...chain.steps[1], status: 'declined', actor_name: 'Priya Raghavan', date: '2026-09-25T10:00:00.000Z' };
        host.chain.set({ state: 'ok', data: chain });
        await render();

        const steps = queryAll('[data-testid="crd-chain-step"]');
        const icons = steps.map(s => s.querySelector('[data-testid="crd-chain-step-icon"]')?.getAttribute('data-icon'));
        // Submission (submitted) = check, SP04 (accepted) = check, SP01 (now declined) = x, SP07 (accepted) = check.
        expect(icons).toEqual(['check', 'check', 'x', 'check']);

        const declinedPill = steps[2].querySelector('[data-testid="crd-chain-step-pill"]')?.textContent?.trim();
        expect(declinedPill).toBe(copy.chain.declinedPill);

        // Falsifier: a declined step's icon is never the same shape as a pending (ring) one.
        const pendingChain = buildMockupChain();
        host.chain.set({ state: 'ok', data: pendingChain });
        await render();
        const pendingIcons = queryAll('[data-testid="crd-chain-step-icon"]').map(el => el.getAttribute('data-icon'));
        expect(pendingIcons[2]).toBe('ring');
        expect(icons[2]).not.toBe(pendingIcons[2]);
      });
    });

    it('"Result not yet submitted": the submission step shows the result status with a pending ring and no actor/date', async () => {
      const chain = buildMockupChain();
      chain.submission = { state: 'not_submitted', result_status_id: 1, result_status_name: 'Editing', actor_name: null, date: null };
      host.chain.set({ state: 'ok', data: chain });
      await render();

      const steps = queryAll('[data-testid="crd-chain-step"]');
      expect(steps[0].querySelector('[data-testid="crd-chain-step-pill"]')?.textContent?.trim()).toBe('Editing');
      expect(steps[0].querySelector('[data-testid="crd-chain-step-icon"]')?.getAttribute('data-icon')).toBe('ring');
      expect(steps[0].querySelector('[data-testid="crd-chain-step-subtitle"]')).toBeNull();
    });

    describe('Falsifier: error state never disables/hides the footer', () => {
      it('renders the inline error + Retry, and Accept stays present and enabled', async () => {
        host.chain.set({ state: 'error' });
        await render();

        const errorEl = query('[data-testid="crd-chain-error"]');
        expect(errorEl?.textContent).toContain(copy.chain.errorMessage);
        expect(queryAll('[data-testid="crd-chain-step"]').length).toBe(0);

        const acceptBtn = query('[data-testid="crd-accept-btn"]') as HTMLButtonElement | null;
        expect(acceptBtn).toBeTruthy();
        acceptBtn?.click();
        expect(host.acceptClickedCount).toBe(1);
      });

      it('Retry emits retryChain', async () => {
        host.chain.set({ state: 'error' });
        await render();

        (query('[data-testid="crd-chain-retry-btn"]') as HTMLButtonElement)?.click();
        expect(host.retryChainCount).toBe(1);
      });

      it('an "ok" state with no data (T-2 advisory: an empty server body) renders the same inline error, never throwing', async () => {
        host.chain.set({ state: 'ok', data: undefined });
        expect(() => fixture.detectChanges()).not.toThrow();
        await fixture.whenStable();

        expect(query('[data-testid="crd-chain-error"]')).toBeTruthy();
      });
    });
  });

  describe('DSP-T-8: MAP TO YOUR THEORY OF CHANGE heading/helper + footer restyle', () => {
    it('decide mode (bilateral, showAlignSlot=true) shows the ToC heading/helper wrapping [crdAlign]', async () => {
      host.mode.set('decide');
      host.showAlignSlot.set(true);
      await render();

      const section = query('[data-testid="crd-toc-section"]');
      expect(section).toBeTruthy();
      expect(section?.querySelector('h3')?.textContent?.trim()).toBe(copy.sections.mapToToc);
      expect(section?.textContent).toContain(copy.toc.helper);
      expect(section?.querySelector('[data-testid="align-slot"]')).toBeTruthy();
    });

    // DSP-T-9 Q-4 (user-approved 2026-10-05): the user chose the mockup's literal wording over the
    // T-8 "accurate indicator" wording. FALSIFIER: the old T-8 string ("Pick the indicator…") fails
    // this exact-string assertion — observed red before the fix.
    it('DSP-T-9 Q-4: the ToC helper is the exact mockup copy, not the T-8 accurate-indicator wording', async () => {
      host.mode.set('decide');
      host.showAlignSlot.set(true);
      await render();

      expect(copy.toc.helper).toBe('Choose the area of work this result contributes to. You can do this later.');
      const section = query('[data-testid="crd-toc-section"]');
      expect(section?.textContent).toContain('Choose the area of work this result contributes to. You can do this later.');
    });

    it('confirm-decline mode (bilateral, showAlignSlot=true) also shows the ToC section', async () => {
      host.mode.set('confirm-decline');
      host.showAlignSlot.set(true);
      await render();

      expect(query('[data-testid="crd-toc-section"]')).toBeTruthy();
    });

    it('Falsifier: a primary request (showAlignSlot=false) in decide mode never shows the ToC heading', async () => {
      host.mode.set('decide');
      host.showAlignSlot.set(false);
      await render();

      expect(query('[data-testid="crd-toc-section"]')).toBeNull();
      // Defense in depth, same as the pre-existing showAlignSlot falsifier above.
      expect(query('[data-testid="align-slot"]')).toBeNull();
    });

    it('Falsifier: a view-mode row shows neither the footer nor the ToC section', async () => {
      host.mode.set('view');
      host.showAlignSlot.set(true);
      await render();

      expect(query('[data-testid="crd-footer"]')).toBeNull();
      expect(query('[data-testid="crd-toc-section"]')).toBeNull();
    });

    it('Falsifier: "Where it contributes" renders before the APPROVAL CHAIN would be a defect — chain must come first', async () => {
      host.mode.set('decide');
      host.reviewRows.set([buildReviewRow()]);
      host.chain.set({ state: 'ok', data: undefined });
      await render();

      const body = query('[data-testid="crd-body"]') as HTMLElement;
      const chainIdx = Array.from(body.children).findIndex(el => el.getAttribute('data-testid') === 'crd-chain-section');
      const reviewIdx = Array.from(body.children).findIndex(el => el.getAttribute('data-testid') === 'crd-review-section');
      expect(chainIdx).toBeGreaterThanOrEqual(0);
      expect(reviewIdx).toBeGreaterThan(chainIdx);
    });

    it('footer uses the restyled px-[20px] py-[14px] padding with a top divider, pinned outside crd-body', async () => {
      host.mode.set('decide');
      await render();

      const footer = query('[data-testid="crd-footer"]') as HTMLElement;
      expect(footer.className).toContain('px-[20px]');
      expect(footer.className).toContain('py-[14px]');
      expect(footer.className).toContain('border-t');
      // Sibling of crd-body, not a descendant — i.e. outside the scrolling area.
      expect(query('[data-testid="crd-body"] [data-testid="crd-footer"]')).toBeNull();
    });
  });
});
