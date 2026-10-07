import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { BilateralRejectionNoticeComponent } from './bilateral-rejection-notice.component';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';

/** Server order: newest first. */
const HISTORY = [
  { id: 4, result_id: 9, action: 'REJECT', comment: 'Reason C', created_at: '2026-10-04T10:00:00Z', created_by: 1, initiative_code: 'SP12' },
  { id: 3, result_id: 9, action: 'RESUBMIT', comment: null, created_at: '2026-10-03T10:00:00Z', created_by: 2, initiative_code: 'SP09' },
  { id: 2, result_id: 9, action: 'REJECT', comment: 'Reason B', created_at: '2026-10-02T10:00:00Z', created_by: 1, initiative_code: 'SP09' },
  { id: 1, result_id: 9, action: 'REJECT', comment: 'Reason A', created_at: '2026-10-01T10:00:00Z', created_by: 1, initiative_code: 'SP09' },
];

describe('BilateralRejectionNoticeComponent (RRC-R-14)', () => {
  let fixture: ComponentFixture<BilateralRejectionNoticeComponent>;
  let api: { GET_bilateralReviewHistory: jest.Mock };

  const text = (testId: string): string | undefined =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim();

  const render = (statusId: number, resultId: number | null = 9) => {
    fixture.componentRef.setInput('statusId', statusId);
    fixture.componentRef.setInput('resultId', resultId);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    api = { GET_bilateralReviewHistory: jest.fn().mockReturnValue(of({ response: HISTORY })) };
    await TestBed.configureTestingModule({
      imports: [BilateralRejectionNoticeComponent],
      providers: [{ provide: BilateralApiService, useValue: api }],
    }).compileComponents();
    fixture = TestBed.createComponent(BilateralRejectionNoticeComponent);
  });

  it('shows the NEWEST rejection (C), with SP code and date, never the oldest', () => {
    render(7);
    expect(text('bilateral-rejection-notice-comment')).toBe('Reason C');
    expect(text('bilateral-rejection-notice-comment')).not.toContain('Reason A');
    expect(text('bilateral-rejection-notice-meta')).toContain('SP12');
    expect(text('bilateral-rejection-notice-meta')).toContain('04 Oct 2026');
  });

  it('picks the newest rejection even if the server answers oldest first', () => {
    api.GET_bilateralReviewHistory.mockReturnValue(of({ response: [...HISTORY].reverse() }));
    render(7);
    expect(text('bilateral-rejection-notice-comment')).toBe('Reason C');
  });

  it('shows the fallback when the newest rejection has an empty comment', () => {
    api.GET_bilateralReviewHistory.mockReturnValue(of({ response: [{ ...HISTORY[0], comment: '  ' }] }));
    render(7);
    expect(text('bilateral-rejection-notice-comment')).toBe('No justification was recorded.');
  });

  it('shows a neutral message when the history fails to load', () => {
    api.GET_bilateralReviewHistory.mockReturnValue(throwError(() => new Error('boom')));
    render(7);
    expect(text('bilateral-rejection-notice-error')).toBe("Couldn't load the rejection reason");
    expect(text('bilateral-rejection-notice-comment')).toBeUndefined();
  });

  it('renders nothing and requests nothing at any other status', () => {
    render(5);
    expect(fixture.nativeElement.querySelector('[data-testid="bilateral-rejection-notice"]')).toBeNull();
    expect(api.GET_bilateralReviewHistory).not.toHaveBeenCalled();
  });

  it('is announced as status text and offers no edit or dismiss control', () => {
    render(7);
    const root = fixture.nativeElement.querySelector('[data-testid="bilateral-rejection-notice"]');
    expect(root.getAttribute('role')).toBe('status');
    expect(root.querySelector('input, textarea, [contenteditable]')).toBeNull();
    expect(root.querySelector('button')).toBeNull(); // short text: not even "Show more"
  });

  it('loads the history once for repeated renders of the same result', () => {
    render(7);
    fixture.componentRef.setInput('statusId', 7);
    fixture.detectChanges();
    fixture.componentRef.setInput('statusId', '7');
    fixture.detectChanges();
    expect(api.GET_bilateralReviewHistory).toHaveBeenCalledTimes(1);
  });

  it('clamps long text to 3 lines and toggles Show more / Show less', () => {
    api.GET_bilateralReviewHistory.mockReturnValue(of({ response: [{ ...HISTORY[0], comment: 'x'.repeat(400) }] }));
    render(7);
    const comment = () => fixture.nativeElement.querySelector('[data-testid="bilateral-rejection-notice-comment"]');
    const toggle = () => fixture.nativeElement.querySelector('[data-testid="bilateral-rejection-notice-toggle"]');
    expect(comment().classList.contains('line-clamp-3')).toBe(true);
    expect(toggle().textContent.trim()).toBe('Show more');
    toggle().click();
    fixture.detectChanges();
    expect(comment().classList.contains('line-clamp-3')).toBe(false);
    expect(toggle().textContent.trim()).toBe('Show less');
  });
});
