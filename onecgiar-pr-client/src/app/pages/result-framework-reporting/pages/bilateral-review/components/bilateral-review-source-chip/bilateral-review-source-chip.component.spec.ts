// @akili-spec bilateral/review-list-source-and-reporter (BSR-T-3, BSR-R-4, BSR-R-5, BSR-R-7, BSR-R-11, BSR-AC-4, BSR-AC-5, BSR-AC-6)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AI_PROVENANCE_NOTICE_TEXT } from '../../../../../bilateral/components/ai-provenance-notice/ai-provenance-notice.component';
import { BILATERAL_REVIEW_COPY } from '../../bilateral-review.copy';
import { BilateralReviewSourceChipComponent } from './bilateral-review-source-chip.component';
import { BilateralSourceDescriptor } from './resolve-bilateral-source';

describe('BilateralReviewSourceChipComponent', () => {
  let fixture: ComponentFixture<BilateralReviewSourceChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BilateralReviewSourceChipComponent] }).compileComponents();
    fixture = TestBed.createComponent(BilateralReviewSourceChipComponent);
  });

  function setSource(source: BilateralSourceDescriptor): void {
    fixture.componentRef.setInput('source', source);
    fixture.detectChanges();
  }

  // BSR-AC-5: the AI case renders through AiProvenanceNoticeComponent, and the repository must
  // not gain a second copy of AI_PROVENANCE_NOTICE_TEXT (D7 / BSR-R-5).
  it('BSR-AC-5: the ai case delegates to app-ai-provenance-notice carrying the ONE shared AI text, not a restated copy', () => {
    setSource({ kind: 'ai' });

    const badge = fixture.debugElement.query(By.css('[data-testid="ai-provenance-badge"]'));
    expect(badge).not.toBeNull();
    expect(badge.nativeElement.getAttribute('aria-label')).toBe(AI_PROVENANCE_NOTICE_TEXT);
    expect(fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-pill"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-placeholder"]'))).toBeNull();
    // D7: the accessible-name assertion above already proves the ONE shared string is present via
    // delegation, referenced through the imported AI_PROVENANCE_NOTICE_TEXT constant rather than
    // restated as a literal here — a second literal in this file would itself be an eighth hit.
  });

  // BSR-AC-4: a neutral pill (here, the UNKNOWN+code trap row's own descriptor) renders its label
  // and carries an accessible name distinct from — and more descriptive than — the visible text
  // (BSR-R-11).
  it('BSR-AC-4: a pill descriptor renders its label as visible text and a descriptive accessible name', () => {
    setSource({ kind: 'pill', label: 'Via API · MEL', accessibleName: BILATERAL_REVIEW_COPY.sourceChip.viaApiWithCodeAccessibleName('MEL') });

    const pill = fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-pill"]'));
    expect(pill).not.toBeNull();
    expect(pill.nativeElement.textContent.trim()).toBe('Via API · MEL');
    expect(pill.nativeElement.getAttribute('aria-label')).toBe('Received through the MEL platform API');
    expect(pill.nativeElement.getAttribute('title')).toBe('Via API · MEL');
    expect(fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-ai"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-placeholder"]'))).toBeNull();
  });

  it('reuses the Contributor chip recipe tokens — only --pr-* tokens, no hex, no *-100 fill', () => {
    setSource({ kind: 'pill', label: 'Manual entry', accessibleName: BILATERAL_REVIEW_COPY.sourceChip.manualEntryAccessibleName });

    const pill = fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-pill"]')).nativeElement as HTMLElement;
    const classList = pill.className;
    expect(classList).toContain('border-[var(--pr-border)]');
    expect(classList).toContain('bg-[var(--pr-surface-app)]');
    expect(classList).toContain('text-[var(--pr-text-secondary)]');
    expect(classList).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(classList).not.toMatch(/--pr-color-\S*-100/);
  });

  it('carries the wrap guard (whitespace-nowrap truncate max-w-full) so it can be clipped by a cell-owned wrapper', () => {
    setSource({ kind: 'pill', label: 'Bulk upload', accessibleName: BILATERAL_REVIEW_COPY.sourceChip.bulkUploadAccessibleName });

    const pill = fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-pill"]')).nativeElement as HTMLElement;
    expect(pill.className).toContain('whitespace-nowrap');
    expect(pill.className).toContain('truncate');
    expect(pill.className).toContain('max-w-full');
  });

  // BSR-AC-6 / BSR-R-7: absent Source renders the module's placeholder pair — an aria-hidden dash
  // plus one sr-only string naming the field — and invents no display value.
  it('BSR-AC-6: the placeholder case renders an aria-hidden dash plus one sr-only string naming Source', () => {
    setSource({ kind: 'placeholder' });

    const dash = fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-placeholder"]'));
    expect(dash).not.toBeNull();
    expect(dash.nativeElement.getAttribute('aria-hidden')).toBe('true');
    expect(dash.nativeElement.textContent.trim()).toBe('—');

    const srOnly = fixture.nativeElement.querySelector('.sr-only');
    expect(srOnly).not.toBeNull();
    expect(srOnly.textContent.trim()).toBe(BILATERAL_REVIEW_COPY.sourceChip.placeholderSrOnly);
    expect(fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-pill"]'))).toBeNull();
    expect(fixture.debugElement.query(By.css('[data-testid="bilateral-review-source-chip-ai"]'))).toBeNull();
  });
});
