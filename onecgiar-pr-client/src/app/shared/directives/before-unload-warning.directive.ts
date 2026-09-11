import { Directive, HostListener, Input } from '@angular/core';

/**
 * Reused by every `rd-*` Result Detail section instead of ~10 duplicated
 * `window:beforeunload` listeners (`UCA-T-4`, `UCA-R-6`).
 *
 * Usage: `<div appBeforeUnloadWarning="hasUnsavedChanges.bind(this)">` (or any
 * `() => boolean` bound expression) — when the bound function returns `true` at
 * the moment the tab is closed/refreshed, the browser's native "leave site"
 * prompt is shown; when it returns `false`, the tab closes normally.
 *
 * See `docs/specs/changes/unsaved-changes-alert/design.md` §6.2.
 */
@Directive({
  selector: '[appBeforeUnloadWarning]',
  standalone: true
})
export class BeforeUnloadWarningDirective {
  @Input() appBeforeUnloadWarning!: () => boolean;

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.appBeforeUnloadWarning || !this.appBeforeUnloadWarning()) {
      return;
    }

    event.preventDefault();
    // Legacy browser compatibility — some engines require `returnValue` to be
    // set (and non-empty) to show the native prompt.
    event.returnValue = '';
  }
}
