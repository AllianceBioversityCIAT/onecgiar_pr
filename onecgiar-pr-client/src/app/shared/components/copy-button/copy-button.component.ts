import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';

/**
 * Copies one short value to the clipboard, for the things a reporter routinely retypes somewhere
 * else — a result code into Jira, a title into an email.
 *
 * Deliberately quiet: it only inks on hover or focus of the row it sits in, so a page full of
 * copyable values does not turn into a page full of buttons. Its own confirmation is the icon
 * swapping to a check for a moment; there is no toast, because the value is right there and the
 * change of glyph is the whole feedback the gesture needs.
 */
@Component({
  selector: 'app-copy-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="pr-copy-btn inline-flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border border-transparent align-middle text-[var(--pr-text-muted)] opacity-0 transition-all duration-150 hover:border-[var(--pr-border)] hover:bg-white hover:text-[var(--pr-color-primary-300)] focus-visible:opacity-100 group-hover/copy:opacity-100"
      [class.pr-copy-btn--done]="copied()"
      [attr.aria-label]="label()"
      [title]="copied() ? 'Copied' : label()"
      (click)="copy($event)">
      <i class="material-icons-round text-[14px] leading-none" aria-hidden="true">{{ copied() ? 'check' : 'content_copy' }}</i>
    </button>
  `,
  styles: `
    /* Arbitrary-value utilities cannot live inside a [class.…] binding — the brackets break
       Angular's template parser — so the copied state is a plain class. */
    .pr-copy-btn--done {
      opacity: 1;
      color: var(--pr-status-approved-fg);
    }
  `
})
export class CopyButtonComponent {
  /** The text that lands on the clipboard. Nothing is rendered when it is empty. */
  readonly value = input<string | null | undefined>('');
  /** Names the thing being copied, e.g. "Result code". */
  readonly what = input<string>('value');

  private readonly clipboard = inject(Clipboard);
  readonly copied = signal(false);
  readonly label = computed(() => `Copy ${this.what()}`);

  copy(event: MouseEvent): void {
    // The button often sits inside a link or a heading row; copying must not navigate.
    event.preventDefault();
    event.stopPropagation();

    const value = (this.value() ?? '').toString().trim();
    if (!value) return;

    this.clipboard.copy(value);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1400);
  }
}
