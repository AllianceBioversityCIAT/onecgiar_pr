import { Component } from '@angular/core';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { resultStatusBg, resultStatusFg } from '../../../../../../shared/constants/result-status-tokens';
import { KpiStatusChipComponent } from './kpi-status-chip.component';

/** @akili-spec result-framework-reporting/kpi-row-status-counts (KRC-T-3) */
describe('KpiStatusChipComponent', () => {
  let fixture: ComponentFixture<KpiStatusChipComponent>;
  const render = (editing: number, submitted: number, approved: number, pendingReview: number) => {
    fixture.componentRef.setInput('editing', editing);
    fixture.componentRef.setInput('submitted', submitted);
    fixture.componentRef.setInput('approved', approved);
    fixture.componentRef.setInput('pendingReview', pendingReview);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  // flex `gap` spaces the pieces visually; the DOM has no whitespace between them, so normalise around the separators
  const text = (el: HTMLElement) => el.textContent?.replace(/\s*([·›])\s*/g, ' $1 ').replace(/\s+/g, ' ').trim();
  const aria = (el: HTMLElement) => (el.querySelector('button') as HTMLButtonElement).getAttribute('aria-label');

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [KpiStatusChipComponent] });
    fixture = TestBed.createComponent(KpiStatusChipComponent);
  });

  it('S-1.3: renders nothing when all counts are zero', () => {
    const el = render(0, 0, 0, 0);
    expect(el.querySelector('button')).toBeNull();
    expect(el.textContent?.trim()).toBe('');
    expect(el.classList.contains('hidden')).toBe(true);
  });

  it('S-1.1: one editing result reads "1 result reported 1 editing" (singular) and shows no 0', () => {
    const el = render(1, 0, 0, 0);
    expect(text(el)).toBe('1 result reported 1 editing ›');
    expect(el.textContent).not.toMatch(/0/);
    expect(el.classList.contains('hidden')).toBe(false);
  });

  it('S-1.2: mixed statuses show the total and only the editing part on the row, never submitted/approved/pending', () => {
    const el = render(1, 2, 1, 1);
    expect(text(el)).toBe('5 results reported 1 editing ›');
    expect(el.textContent).not.toMatch(/submitted|approved|pending/);
  });

  it('S-1.5: approved only reads "1 result reported" with no editing and no submitted wording', () => {
    const el = render(0, 0, 1, 0);
    expect(text(el)).toBe('1 result reported ›');
    expect(el.textContent).not.toMatch(/editing|submitted/);
  });

  it('total = editing + submitted + approved + pending (KRC-R-2)', () => {
    render(2, 3, 4, 5);
    expect(fixture.componentInstance.total()).toBe(14);
  });

  it('is one single-line button with the full-words aria-label and the click-through tooltip', () => {
    const el = render(1, 2, 1, 1);
    const btn = el.querySelector('button') as HTMLButtonElement;
    expect(el.querySelectorAll('button').length).toBe(1);
    expect(btn.type).toBe('button');
    expect(btn.className).toContain('whitespace-nowrap');
    expect(aria(el)).toBe('5 results reported: 1 in Editing, 2 submitted, 1 approved, 1 pending review');
    expect(btn.getAttribute('title')).toBe('Editing results do not count towards Achieved until submitted. Click to see all 5 reported results.');
  });

  it('aria-label lists only non-zero groups and is singular for one result', () => {
    expect(aria(render(0, 0, 1, 0))).toBe('1 result reported: 1 approved');
    expect(aria(render(0, 3, 0, 2))).toBe('5 results reported: 3 submitted, 2 pending review');
  });

  describe('amendment #4: colour only on the editing badge', () => {
    const root = (el: HTMLElement) => el.querySelector('button') as HTMLButtonElement;

    it.each([
      ['editing only', 1, 0, 0, 0],
      ['mixed', 1, 2, 1, 1],
      ['no editing', 0, 1, 1, 1],
      ['approved only', 0, 0, 1, 0]
    ])('the button root carries no status tint (%s)', (_n, e, s, a, p) => {
      const el = render(e as number, s as number, a as number, p as number);
      const style = root(el).getAttribute('style') ?? '';
      expect(style).not.toMatch(/color|background/);
      expect(root(el).hasAttribute('data-tint')).toBe(false);
      expect(root(el).className).toMatch(/var\(--pr-border\)/);
      expect(root(el).className).not.toMatch(/--pr-status-/);
    });

    it('the component template never styles the root button with a status pair (source lock)', () => {
      const src = readFileSync(join(__dirname, 'kpi-status-chip.component.ts'), 'utf-8');
      const rootTag = src.slice(src.indexOf('<button'), src.indexOf('>', src.indexOf('(click)=')));
      expect(rootTag).not.toContain('[style.');
    });

    it('the editing badge exists only when editing > 0 and carries the Editing pair', () => {
      const withEditing = render(2, 0, 0, 0);
      const badge = withEditing.querySelector('[data-part="editing"]') as HTMLElement;
      expect(badge).not.toBeNull();
      expect(badge.textContent?.replace(/\s+/g, ' ').trim()).toBe('2 editing');
      expect(badge.closest('button')).toBe(root(withEditing));
      expect(fixture.componentInstance.editingTint).toEqual({ fg: resultStatusFg(1), bg: resultStatusBg(1) });
    });

    it('no editing badge when editing is 0', () => {
      expect(render(0, 3, 1, 1).querySelector('[data-part="editing"]')).toBeNull();
    });
  });

  describe('S-7.1: opening', () => {
    @Component({
      imports: [KpiStatusChipComponent],
      template: `<div class="row" (click)="rowClick()" (keydown)="rowKey()"><app-kpi-status-chip [editing]="1" (open)="opened()" /></div>`
    })
    class HostComponent {
      rowClick = jest.fn();
      rowKey = jest.fn();
      opened = jest.fn();
    }

    it('click emits open once and does not reach the row', () => {
      const host = TestBed.createComponent(HostComponent);
      host.detectChanges();
      (host.nativeElement.querySelector('button') as HTMLButtonElement).click();
      expect(host.componentInstance.opened).toHaveBeenCalledTimes(1);
      expect(host.componentInstance.rowClick).not.toHaveBeenCalled();
    });

    it('Enter keydown is isolated from the row; the native button click then emits open once', () => {
      const host = TestBed.createComponent(HostComponent);
      host.detectChanges();
      const btn = host.nativeElement.querySelector('button') as HTMLButtonElement;
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      btn.click(); // browsers synthesize this click from Enter
      expect(host.componentInstance.rowKey).not.toHaveBeenCalled();
      expect(host.componentInstance.opened).toHaveBeenCalledTimes(1);
      expect(host.componentInstance.rowClick).not.toHaveBeenCalled();
    });
  });
});
