import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClampedTextComponent } from './clamped-text.component';
import { CLAMPED_TEXT_COPY } from '../../../internationalization/clamped-text.copy';

/**
 * jsdom has no layout (`scrollHeight`/`clientHeight` are 0), so overflow detection cannot be proven
 * here — it is covered by the Cypress CT spec. These tests drive the `expanded` state through
 * `toggle()`, which keeps the button rendered by itself (no measurement spy is used).
 */
describe('ClampedTextComponent (TKR-S-2.1 / S-2.3 state)', () => {
  let fixture: ComponentFixture<ClampedTextComponent>;
  let el: HTMLElement;

  const button = () => el.querySelector('button') as HTMLButtonElement | null;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ClampedTextComponent] });
    fixture = TestBed.createComponent(ClampedTextComponent);
    el = fixture.nativeElement;
    fixture.componentRef.setInput('text', 'KPI A');
    fixture.detectChanges();
  });

  /** Expand without relying on layout: the component exposes `toggle()` and keeps the button while expanded. */
  const expand = () => {
    fixture.componentInstance.toggle();
    fixture.detectChanges();
  };

  it('starts collapsed and renders the text', () => {
    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(el.textContent).toContain('KPI A');
  });

  it('label switches Show more -> Show less with expanded, and aria-expanded mirrors it', () => {
    expand();
    expect(button()?.textContent).toContain(CLAMPED_TEXT_COPY.showLess);
    expect(button()?.getAttribute('aria-expanded')).toBe('true');
    fixture.componentInstance.toggle();
    fixture.detectChanges();
    // collapsed again: jsdom measures no overflow, so the button disappears (S-2.2 path)
    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(button()).toBeNull();
  });

  it('resets expanded to false when text changes (S-2.3)', () => {
    expand();
    expect(fixture.componentInstance.expanded()).toBe(true);
    fixture.componentRef.setInput('text', 'KPI B');
    fixture.detectChanges();
    expect(fixture.componentInstance.expanded()).toBe(false);
    expect(el.textContent).toContain('KPI B');
  });

  it('button is a real type=button', () => {
    expand();
    expect(button()?.getAttribute('type')).toBe('button');
  });
});
