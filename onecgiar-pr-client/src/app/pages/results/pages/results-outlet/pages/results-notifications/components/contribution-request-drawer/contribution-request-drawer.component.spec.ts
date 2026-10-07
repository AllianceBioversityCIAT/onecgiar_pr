// @akili-spec contribution-request-drawer (CRD-T-1, CRD-T-2, CRD-T-4 forward pointer 5)
// @akili-spec notifications/detail-side-panel (DSP-T-3)
//
// DSP-T-3 reduced this component to a thin sheet shell (`open`, `labelledBy`, `closed` for the
// sheet's own scrim/Escape/outside-click dismissal). Every test that exercised the body/footer
// markup/logic (header sentence, RESULT card, review tables, footer, `[crdAlign]` gating,
// `needsMore`/expand, focus-scroll, the content ✕ button) MOVED 1:1 to
// `../notification-detail-content/notification-detail-content.component.spec.ts` — see that file's
// own header comment for the full list. What stays here tests only the shell's own remaining
// surface: `open`-driven panel visibility, the sheet's native scrim/Escape close, the panel's width
// override (CRD-P-9) and motion-reduce classes (both still live on this component's own
// `hlm-sheet-content`), the single-close-surface guarantee (`showCloseButton=false`), and the new
// `labelledBy` → `aria-labelledby` passthrough (DSP falsifier: "the sheet panel has no accessible
// name").
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HlmSheet } from '@spartan/sheet';
import { ContributionRequestDrawerComponent } from './contribution-request-drawer.component';

@Component({
  standalone: true,
  imports: [ContributionRequestDrawerComponent],
  template: `
    <app-contribution-request-drawer
      [open]="open()"
      [labelledBy]="labelledBy()"
      [describedBy]="describedBy()"
      (closed)="onClosed()"
    >
      <div data-testid="projected-content">projected content</div>
    </app-contribution-request-drawer>
  `
})
class HostComponent {
  readonly open = signal(false);
  readonly labelledBy = signal<string | null>(null);
  readonly describedBy = signal<string | null>(null);

  closedCount = 0;

  onClosed(): void {
    this.closedCount++;
  }
}

describe('ContributionRequestDrawerComponent (shell, DSP-T-3)', () => {
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

  it('projects content via <ng-content /> inside the sheet panel', async () => {
    await openDrawer();

    expect(query('[data-testid="crd-panel"] [data-testid="projected-content"]')).toBeTruthy();
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

  it('does NOT render the sheet-content built-in close button (showCloseButton=false, single close surface — DSP-T-3: the sole close button now lives in notification-detail-content)', async () => {
    await openDrawer();

    // The built-in close renders `<span class="sr-only">Close</span>` — nothing projected here does.
    const builtIn = queryAll('[data-slot="sheet-close"] span.sr-only').find(el => el.textContent === 'Close');
    expect(builtIn).toBeUndefined();
  });

  describe('DSP-T-3 attempt 2: labelledBy/describedBy → <hlm-sheet>[aria-labelledby/describedby] (DD-3, falsifier "the sheet panel has no accessible name")', () => {
    // Reviewer FAIL issue 1 (attempt 1): asserting `panel()?.getAttribute('aria-labelledby')`
    // only proved the attribute existed on `hlm-sheet-content` — a role-less element AT ignores.
    // The real accessible name comes from `BrnDialog.ariaLabelledBy` (aliased `aria-labelledby`,
    // inherited by `HlmSheet`), which only `<hlm-sheet>` itself carries and which flows into the
    // CDK dialog's `role="dialog"` container config. Assert it on the `HlmSheet` directive
    // instance instead of the DOM, matching the real forwarding mechanism.
    function hlmSheetInstance(): HlmSheet {
      const debugEl = fixture.debugElement.query(By.directive(HlmSheet));
      expect(debugEl).toBeTruthy();
      return debugEl.injector.get(HlmSheet);
    }

    it('forwards `labelledBy` onto <hlm-sheet>´s own aria-labelledby input (BrnDialog.ariaLabelledBy)', async () => {
      host.labelledBy.set('crd-heading-42');
      await openDrawer();

      expect((hlmSheetInstance() as unknown as { ariaLabelledBy: string | null }).ariaLabelledBy).toBe('crd-heading-42');
    });

    it('forwards `describedBy` onto <hlm-sheet>´s own aria-describedby input (BrnDialog.ariaDescribedBy)', async () => {
      host.describedBy.set('crd-heading-42-desc');
      await openDrawer();

      expect((hlmSheetInstance() as unknown as { ariaDescribedBy: string | null }).ariaDescribedBy).toBe('crd-heading-42-desc');
    });

    it('DISQUALIFIER falsifier: a null `labelledBy`/`describedBy` forwards `null`, never a fabricated id or the literal string "null"', async () => {
      host.labelledBy.set(null);
      host.describedBy.set(null);
      await openDrawer();

      const sheet = hlmSheetInstance() as unknown as { ariaLabelledBy: string | null; ariaDescribedBy: string | null };
      expect(sheet.ariaLabelledBy).toBeNull();
      expect(sheet.ariaDescribedBy).toBeNull();
    });
  });
});
