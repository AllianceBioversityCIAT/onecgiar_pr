// @akili-spec changes/reporting-favorite-indicators
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ReportingProgramBandComponent } from './reporting-program-band.component';
// @akili-spec changes/sp-bilateral-review-tab (BRT-T-1, BRT-R-5) — one useValue stub, per the
// spec's allowance, so the band's new injected dependency does not issue a real HTTP request here.
import { BilateralReviewCountService } from '../../../bilateral-review/services/bilateral-review-count.service';
// @akili-spec changes/bilateral-review-center-strip-and-phase (BRC-T-1, BRC-R-6) — one useValue
// stub, per the spec's allowance (judgment-day L-2).
import { DataControlService } from '../../../../../../shared/services/data-control.service';

/**
 * RFI-T-3 — the Favorites switch in the Reporting toolbar.
 *
 * Covers RFI-AC-11 (switch renders, count, aria-checked, click emits the flipped value, glyph
 * follows state) and RFI-AC-12 (hidden in the By-AOW compact view). Mirrors the `build()` helper
 * from `reporting-program-band.component.spec.ts`.
 */
describe('ReportingProgramBandComponent — favorites switch', () => {
  let fixture: ComponentFixture<ReportingProgramBandComponent>;
  let component: ReportingProgramBandComponent;

  const build = async (inputs: Record<string, unknown> = {}) => {
    await TestBed.configureTestingModule({
      imports: [ReportingProgramBandComponent],
      providers: [
        provideRouter([]),
        { provide: BilateralReviewCountService, useValue: { count: () => signal<number | null>(null), ensure: jest.fn() } },
        { provide: DataControlService, useValue: { reportingCurrentPhase: { phaseId: 36 }, reportingPhaseVersion: signal(0) } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ReportingProgramBandComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('programCode', 'SP01');
    fixture.componentRef.setInput('programName', 'Breeding for Tomorrow');
    fixture.componentRef.setInput('collapsible', true);
    fixture.componentRef.setInput('showToolbar', true);
    fixture.componentRef.setInput('compactFilters', false);
    Object.entries(inputs).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
  };

  const root = () => fixture.nativeElement as HTMLElement;
  const switchEl = () => root().querySelector<HTMLButtonElement>('[data-testid="favorites-switch"]');

  // ── RFI-AC-11 ──────────────────────────────────────────────────────────────
  describe('renders and toggles the switch', () => {
    it('renders exactly one switch with role="switch", aria-checked="false" and the live count', async () => {
      await build({ favoritesCount: 3, favoritesOnly: false });

      const switches = root().querySelectorAll('[data-testid="favorites-switch"]');
      expect(switches.length).toBe(1);

      const el = switchEl()!;
      expect(el.getAttribute('role')).toBe('switch');
      expect(el.getAttribute('aria-checked')).toBe('false');
      expect(el.textContent).toContain('Favorites');
      expect(el.textContent).toContain('3');
    });

    it('renders star_outline when off and emits favoritesOnlyChange(true) on click', async () => {
      await build({ favoritesCount: 3, favoritesOnly: false });

      const emitted: boolean[] = [];
      component.favoritesOnlyChange.subscribe((v: boolean) => emitted.push(v));

      const el = switchEl()!;
      expect(el.querySelector('.material-icons-round')?.textContent?.trim()).toBe('star_outline');

      el.click();

      expect(emitted).toEqual([true]);
    });

    it('reflects favoritesOnly = true as aria-checked="true", glyph "star" and emits false on click', async () => {
      await build({ favoritesCount: 3, favoritesOnly: true });

      const emitted: boolean[] = [];
      component.favoritesOnlyChange.subscribe((v: boolean) => emitted.push(v));

      const el = switchEl()!;
      expect(el.getAttribute('aria-checked')).toBe('true');
      expect(el.querySelector('.material-icons-round')?.textContent?.trim()).toBe('star');

      el.click();

      expect(emitted).toEqual([false]);
    });
  });

  // ── RFI-AC-12 ──────────────────────────────────────────────────────────────
  it('renders zero favorites switches when compactFilters is true', async () => {
    await build({ favoritesCount: 3, favoritesOnly: false, compactFilters: true });

    expect(root().querySelectorAll('[data-testid="favorites-switch"]').length).toBe(0);
  });

  // ── Placement ────────────────────────────────────────────────────────────
  it('sits immediately after the "Only pending" switch as its next element sibling', async () => {
    await build({ favoritesCount: 3, favoritesOnly: false });

    const switches = Array.from(root().querySelectorAll<HTMLButtonElement>('[role="switch"]'));
    const onlyPendingEl = switches.find(btn => btn.textContent?.includes('Only pending'));
    expect(onlyPendingEl).toBeTruthy();
    expect(onlyPendingEl!.nextElementSibling).toBe(switchEl());
  });
});
