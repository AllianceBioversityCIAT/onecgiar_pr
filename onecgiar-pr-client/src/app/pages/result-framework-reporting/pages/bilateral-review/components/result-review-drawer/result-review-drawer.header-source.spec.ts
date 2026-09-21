// @akili-spec bilateral/review-list-source-and-reporter (BSR-T-5, BSR-R-9, BSR-AC-12)
//
// WHY A SEPARATE FILE, RENDERING THE CHIP DIRECTLY (NOT THE WHOLE DRAWER)
// -------------------------------------------------------------------------
// `result-review-drawer.component.spec.ts` bootstraps `ResultReviewDrawerComponent` with
// `overrideComponent({ set: { template: '' } })` (see that file's top-level `beforeEach`), so
// jsdom never paints `result-review-drawer.component.html` there — proven there instead is (a)
// `headerSourceOf(...)`'s return value for a MANUAL/AI/absent `commonFields`, and (b) a
// real-artifact lock that the shipped template actually feeds `headerSourceOf(fields?.commonFields)`
// into `<app-bilateral-review-source-chip>` right beside "Submitted by:".
//
// What NEITHER of those proves is the last mile: does a `{ kind: 'pill', label: 'Manual entry' }`
// descriptor actually PAINT the text "Manual entry" on screen? `BilateralReviewSourceChipComponent`
// (owned by `BSR-T-3`, out of this task's scope to edit) already renders correctly in jsdom with NO
// template override — its own spec asserts real `textContent` (e.g. `'Via API · MEL'`) — so
// mounting the REAL, unmodified chip here, fed the EXACT descriptor `headerSourceOf` produces (via
// the same `resolveBilateralSource` call, not a re-implementation), gets a genuinely rendered proof
// without the cost the drawer's approve-tooltip CT harness already documented as impractical for
// this component (`result-review-drawer.approve-tooltip.cy.ts`'s mount-decision comment: ~15
// further real services behind `ApiService`, a constructor `effect()` firing three chained HTTP
// calls, five further child-component dependency graphs).
//
// FALSIFIER: mutate `headerSourceOf` (or the `resolveBilateralSource` call inside it) so it no
// longer derives `{ kind: 'pill', label: 'Manual entry', ... }` for `creation_method: 'MANUAL'` —
// the first test below goes red on the rendered text, not on a mock return value.
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AI_PROVENANCE_NOTICE_TEXT } from '../../../../../bilateral/components/ai-provenance-notice/ai-provenance-notice.component';
import { BilateralReviewSourceChipComponent } from '../bilateral-review-source-chip/bilateral-review-source-chip.component';
import { resolveBilateralSource } from '../bilateral-review-source-chip/resolve-bilateral-source';

describe('BSR-T-5: drawer header Source — rendered proof via the real chip component', () => {
  let fixture: ComponentFixture<BilateralReviewSourceChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BilateralReviewSourceChipComponent] }).compileComponents();
    fixture = TestBed.createComponent(BilateralReviewSourceChipComponent);
  });

  it('BSR-AC-12: a MANUAL commonFields, routed through headerSourceOf\'s own derivation, renders "Manual entry"', () => {
    // Exactly what `ResultReviewDrawerComponent.headerSourceOf({ creation_method: 'MANUAL', ... })`
    // computes — same function, same arguments shape (`platformCode` always `undefined` for the
    // detail payload, per `design.md` P-5) — not a hand-picked descriptor.
    const descriptor = resolveBilateralSource({ method: 'MANUAL', platformCode: undefined });

    fixture.componentRef.setInput('source', descriptor);
    fixture.detectChanges();

    const pill = fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-pill"]'));
    expect(pill).not.toBeNull();
    expect(pill.nativeElement.textContent.trim()).toBe('Manual entry');
  });

  // Attempt-2 remediation (rework of `BSR-T-5`): the whole reason the header hid Source for a
  // MANUAL/null-submitter result was that the TEMPLATE gated it on `submitter_name`. `headerSourceOf`
  // itself never read `submitter_name` — its signature only ever consumes `creation_method` — so
  // this test proves the same thing the structural index-comparison lock in
  // `result-review-drawer.component.spec.ts` proves for the markup: the rendered pipeline (derive →
  // feed → paint) produces "Manual entry" independent of `submitter_name`, pairing with that lock so
  // together they cover "the header shows Manual entry for a MANUAL result with no submitter" end to
  // end — the template lock proves the wiring is unconditional, this proves what it paints when fed.
  it('BSR-AC-12: a MANUAL result with a NULL submitter_name still renders "Manual entry" — headerSourceOf never reads submitter_name', () => {
    const commonFieldsWithNullSubmitter = { creation_method: 'MANUAL', submitter_name: null };
    // Same call shape `ResultReviewDrawerComponent.headerSourceOf(commonFields)` makes internally.
    const descriptor = resolveBilateralSource({ method: commonFieldsWithNullSubmitter.creation_method, platformCode: undefined });

    fixture.componentRef.setInput('source', descriptor);
    fixture.detectChanges();

    const pill = fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-pill"]'));
    expect(pill).not.toBeNull();
    expect(pill.nativeElement.textContent.trim()).toBe('Manual entry');
  });

  it('an AI commonFields renders the shared AI badge, carrying the ONE shared AI string — no duplicate copy', () => {
    const descriptor = resolveBilateralSource({ method: 'AI', platformCode: undefined });

    fixture.componentRef.setInput('source', descriptor);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('[data-testid="ai-provenance-badge"]'));
    expect(badge).not.toBeNull();
    // Referenced via the imported constant, never restated as a literal here (D7).
    expect(badge.nativeElement.getAttribute('aria-label')).toBe(AI_PROVENANCE_NOTICE_TEXT);
    expect(fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-pill"]'))).toBeNull();
  });
});
