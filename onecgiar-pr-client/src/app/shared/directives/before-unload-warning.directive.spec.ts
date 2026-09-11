import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BeforeUnloadWarningDirective } from './before-unload-warning.directive';

@Component({
  standalone: true,
  imports: [BeforeUnloadWarningDirective],
  template: `<div [appBeforeUnloadWarning]="dirtyCheckFn"></div>`
})
class HostComponent {
  dirtyCheckFn: () => boolean = () => false;
}

/**
 * Sets the bound function BEFORE the fixture's first `detectChanges()` call — a
 * genuine re-binding via `fixture.componentInstance.<prop> = ...` followed by a
 * second `detectChanges()` on the same fixture trips `NG0100` in this project's
 * Angular 21 + Zone test setup (the fixture's checkNoChanges pass compares against
 * a stale snapshot). Fresh-fixture-per-scenario sidesteps that entirely and is a
 * perfectly valid way to assert the directive's behavior per DoD input.
 */
function createHost(dirtyCheckFn: () => boolean): ComponentFixture<HostComponent> {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.dirtyCheckFn = dirtyCheckFn;
  fixture.detectChanges();
  return fixture;
}

function fireBeforeUnload(): BeforeUnloadEvent {
  const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
  jest.spyOn(event, 'preventDefault');
  window.dispatchEvent(event);
  return event;
}

describe('BeforeUnloadWarningDirective', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('calls preventDefault() and sets returnValue when the bound function returns true', () => {
    createHost(() => true);

    const event = fireBeforeUnload();

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    // jsdom's `Event.returnValue` is WebIDL-typed `boolean` (unlike real browsers, which accept
    // any legacy value), so assigning `''` coerces to `false` here — which is itself the
    // spec-correct "cancelled" value for `BeforeUnloadEvent.returnValue`. Assert the coerced
    // value, not the literal string the directive assigns.
    expect(event.returnValue).toBe(false);
  });

  it('does NOT call preventDefault() when the bound function returns false', () => {
    createHost(() => false);

    const event = fireBeforeUnload();

    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
