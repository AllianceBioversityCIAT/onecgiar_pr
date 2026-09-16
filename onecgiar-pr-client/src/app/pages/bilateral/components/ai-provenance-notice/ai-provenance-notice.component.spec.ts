import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiProvenanceNoticeComponent, AI_PROVENANCE_NOTICE_TEXT } from './ai-provenance-notice.component';

describe('AiProvenanceNoticeComponent', () => {
  let fixture: ComponentFixture<AiProvenanceNoticeComponent>;
  let component: AiProvenanceNoticeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiProvenanceNoticeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AiProvenanceNoticeComponent);
    component = fixture.componentInstance;
  });

  it('renders the copy constant as text for the banner variant', () => {
    fixture.componentRef.setInput('variant', 'banner');
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="ai-provenance-banner"]');
    expect(el).toBeTruthy();
    expect(el.textContent).toContain(AI_PROVENANCE_NOTICE_TEXT);
  });

  it('renders the copy constant as text for the line variant', () => {
    fixture.componentRef.setInput('variant', 'line');
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="ai-provenance-line"]');
    expect(el).toBeTruthy();
    expect(el.textContent).toContain(AI_PROVENANCE_NOTICE_TEXT);
  });

  it('renders the badge variant by default, with the full sentence as aria-label and title', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="ai-provenance-badge"]');
    expect(el).toBeTruthy();
    expect(el.getAttribute('aria-label')).toBe(AI_PROVENANCE_NOTICE_TEXT);
    expect(el.getAttribute('title')).toBe(AI_PROVENANCE_NOTICE_TEXT);
  });

  it('renders the badge variant when explicitly requested', () => {
    fixture.componentRef.setInput('variant', 'badge');
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('[data-testid="ai-provenance-badge"]');
    expect(el).toBeTruthy();
    expect(el.getAttribute('aria-label')).toBe(AI_PROVENANCE_NOTICE_TEXT);
  });

  it('exposes the same sentence used app-wide as one constant', () => {
    expect(component.noticeText).toBe(AI_PROVENANCE_NOTICE_TEXT);
  });
});
