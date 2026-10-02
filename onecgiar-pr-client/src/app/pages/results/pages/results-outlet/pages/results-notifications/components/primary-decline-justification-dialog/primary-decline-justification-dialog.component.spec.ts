// @akili-spec notifications/primary-decline-rejects-result (PDR-T-3)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
// Resolves to tests/mocks/spartanBrainMock.ts under Jest (moduleNameMapper) — its `BrnButton` stub
// doesn't host-bind `disabled` to the native DOM attribute, so `nativeElement.disabled` is never a
// valid assertion here (see notification-item/CLAUDE.md's "Jest caveat"). Query the directive's
// own `disabled` input instead, same convention as the rest of this codebase.
import { BrnButton } from '@spartan-ng/brain/button';

import { PrimaryDeclineJustificationDialogComponent } from './primary-decline-justification-dialog.component';

describe('PrimaryDeclineJustificationDialogComponent', () => {
  let fixture: ComponentFixture<PrimaryDeclineJustificationDialogComponent>;
  let component: PrimaryDeclineJustificationDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrimaryDeclineJustificationDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PrimaryDeclineJustificationDialogComponent);
    component = fixture.componentInstance;
  });

  function open(): void {
    fixture.componentRef.setInput('resultCode', '9391');
    fixture.componentRef.setInput('programCode', 'SP09');
    component.visible.set(true);
    fixture.detectChanges();
  }

  /** Reads the rendered Confirm button's state the way a real view does — never `component.confirmDisabled()` directly. */
  function confirmButtonDisabled(): boolean | string | undefined {
    const confirmButtonDe = fixture.debugElement.queryAll(By.css('.modal-actions button'))[1];
    return confirmButtonDe.injector.get(BrnButton).disabled;
  }

  it('creates with its defaults', () => {
    expect(component).toBeTruthy();
    expect(component.visible()).toBe(false);
    expect(component.resultCode()).toBe('');
    expect(component.programCode()).toBe('');
    expect(component.isSaving()).toBe(false);
    expect(component.text()).toBe('');
  });

  describe('title and message (PDR-R-1 "SP09 opens the decline pop-up")', () => {
    it('builds the title with an en dash and the result code', () => {
      fixture.componentRef.setInput('resultCode', '9391');
      fixture.detectChanges();
      expect(component.title()).toBe('DECLINE PRIMARY ROLE – 9391');
    });

    it('builds the message with the program code', () => {
      fixture.componentRef.setInput('programCode', 'SP09');
      fixture.detectChanges();
      expect(component.message()).toBe('Please explain why SP09 declines to be the primary Science Program of this result.');
    });
  });

  describe('Confirm enablement', () => {
    it('is disabled when the text is empty', () => {
      open();
      expect(component.confirmDisabled()).toBe(true);
    });

    it('is disabled for whitespace-only text (falsifier: "   \\n " must not enable Confirm)', () => {
      open();
      component.text.set('   \n ');
      expect(component.confirmDisabled()).toBe(true);
    });

    it('is enabled once there is real text', () => {
      open();
      component.text.set('This work is outside our portfolio');
      expect(component.confirmDisabled()).toBe(false);
    });

    it('is disabled while saving, even with real text (falsifier: "ok" + isSaving=true must not enable Confirm)', () => {
      open();
      component.text.set('ok');
      fixture.componentRef.setInput('isSaving', true);
      fixture.detectChanges();
      expect(component.confirmDisabled()).toBe(true);
    });
  });

  describe('onCancel', () => {
    it('does nothing while saving (falsifier: Cancel must not close/emit while saving)', () => {
      open();
      fixture.componentRef.setInput('isSaving', true);
      fixture.detectChanges();
      const cancelSpy = jest.spyOn(component.cancelEvent, 'emit');
      component.onCancel();
      expect(component.visible()).toBe(true);
      expect(cancelSpy).not.toHaveBeenCalled();
    });

    it('closes and notifies when idle', () => {
      open();
      const cancelSpy = jest.spyOn(component.cancelEvent, 'emit');
      component.onCancel();
      expect(component.visible()).toBe(false);
      expect(cancelSpy).toHaveBeenCalled();
    });

    it('reopening after Cancel shows an empty field (falsifier: old text must not survive reopen)', () => {
      open();
      component.text.set('This work is outside our portfolio');
      component.onCancel();
      expect(component.visible()).toBe(false);

      component.visible.set(true);
      fixture.detectChanges();
      expect(component.text()).toBe('');
    });
  });

  describe('onConfirm', () => {
    it('ignores a blank or whitespace-only justification', () => {
      open();
      const spy = jest.spyOn(component.confirm, 'emit');
      component.text.set('   ');
      component.onConfirm();
      expect(spy).not.toHaveBeenCalled();
    });

    it('emits the trimmed justification (falsifier: emitted value must be trimmed)', () => {
      open();
      const spy = jest.spyOn(component.confirm, 'emit');
      component.text.set('  This work is outside our portfolio  ');
      component.onConfirm();
      expect(spy).toHaveBeenCalledWith('This work is outside our portfolio');
    });

    it('does not emit twice on two Confirm clicks (falsifier)', () => {
      open();
      const spy = jest.spyOn(component.confirm, 'emit');
      component.text.set('This work is outside our portfolio');
      component.onConfirm();
      component.onConfirm();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('does nothing while saving', () => {
      open();
      const spy = jest.spyOn(component.confirm, 'emit');
      component.text.set('This work is outside our portfolio');
      fixture.componentRef.setInput('isSaving', true);
      fixture.detectChanges();
      component.onConfirm();
      expect(spy).not.toHaveBeenCalled();
    });

    it('allows a retry after a failed save (isSaving true -> false) without reopening — regression for a 400 (PDR-R-1 "server error" scenario)', () => {
      open();
      const spy = jest.spyOn(component.confirm, 'emit');
      component.text.set('This work is outside our portfolio');
      component.onConfirm();
      expect(spy).toHaveBeenCalledTimes(1);

      // Caller sets isSaving true while the request is in flight...
      fixture.componentRef.setInput('isSaving', true);
      fixture.detectChanges();
      // ...then the 400 comes back: caller sets isSaving false, keeps the dialog open and the text.
      fixture.componentRef.setInput('isSaving', false);
      fixture.detectChanges();

      expect(component.text()).toBe('This work is outside our portfolio');
      expect(component.confirmDisabled()).toBe(false);

      component.onConfirm();
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenLastCalledWith('This work is outside our portfolio');
    });

    it('still does not emit twice on two Confirm clicks within the same in-flight save (isSaving never toggled)', () => {
      open();
      const spy = jest.spyOn(component.confirm, 'emit');
      component.text.set('This work is outside our portfolio');
      component.onConfirm();
      component.onConfirm();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset on open (PDR-R-1 "the text resets on every open")', () => {
    it('clears any leftover text and the confirmed guard when visible flips to true', () => {
      open();
      component.text.set('leftover');
      component.onConfirm();

      // Simulate the parent closing the dialog after Confirm, then the Recipient reopening it.
      component.visible.set(false);
      fixture.detectChanges();
      component.visible.set(true);
      fixture.detectChanges();

      expect(component.text()).toBe('');
      expect(component.confirmDisabled()).toBe(true);
    });
  });

  describe('rendered dialog chrome', () => {
    it('renders the reject-styled title, message and required label when visible', () => {
      open();
      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('.modal-title.reject')?.textContent).toContain('DECLINE PRIMARY ROLE – 9391');
      expect(compiled.querySelector('.modal-message')?.textContent).toContain('SP09 declines to be the primary Science Program');
      expect(compiled.querySelector('.modal-label.required')?.textContent).toContain('Justification');
    });

    it('renders nothing when not visible', () => {
      fixture.detectChanges();
      const compiled: HTMLElement = fixture.nativeElement;
      expect(compiled.querySelector('.modal-title')).toBeNull();
    });
  });

  describe('inert while saving (PDR-R-1 "saving" scenario: Cancel and close disabled)', () => {
    it('disables the Cancel button', () => {
      open();
      fixture.componentRef.setInput('isSaving', true);
      fixture.detectChanges();
      const cancelButtonDe = fixture.debugElement.query(By.css('.modal-actions button'));
      expect(cancelButtonDe.injector.get(BrnButton).disabled).toBe(true);
    });

    it('Escape does nothing while saving (closeOnEscape is bound to !isSaving)', () => {
      open();
      fixture.componentRef.setInput('isSaving', true);
      fixture.detectChanges();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(component.visible()).toBe(true);
    });

    it('the mask does nothing while saving (dismissableMask is bound to !isSaving)', () => {
      open();
      fixture.componentRef.setInput('isSaving', true);
      fixture.detectChanges();
      const mask = fixture.nativeElement.querySelector('.pr-dialog-mask, [class*="mask"]') as HTMLElement | null;
      mask?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(component.visible()).toBe(true);
    });

    it('Escape and Cancel still work once not saving', () => {
      open();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(component.visible()).toBe(false);
    });
  });

  describe('OnPush reactivity after a 400 (PDR-T-4 Reviewer finding, attempt 3)', () => {
    it('re-enables the rendered Confirm button once isSaving flips back to false, with a single plain detectChanges() and no NG0100', () => {
      open();
      component.text.set('This work is outside our portfolio');
      fixture.detectChanges();

      component.onConfirm();
      fixture.componentRef.setInput('isSaving', true);
      fixture.detectChanges();
      expect(confirmButtonDisabled()).toBeTruthy();

      // The 400 comes back: caller sets isSaving false, text stays. A single, ordinary
      // detectChanges() (no `false` flag to dodge NG0100) must be enough — `confirmDisabled` is a
      // `computed()` over signals, so the OnPush view is marked dirty on its own.
      fixture.componentRef.setInput('isSaving', false);
      expect(() => fixture.detectChanges()).not.toThrow();

      expect(confirmButtonDisabled()).toBeFalsy();
    });
  });
});
