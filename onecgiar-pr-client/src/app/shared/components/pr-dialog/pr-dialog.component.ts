import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, booleanAttribute } from '@angular/core';

/**
 * app-pr-dialog — PRMS reusable dialog wrapper (PrimeNG p-dialog replacement).
 *
 * Keeps the familiar declarative API so migration off `<p-dialog>` is ~1:1:
 *   <app-pr-dialog [(visible)]="show" [modal]="true" header="Title" (onHide)="...">
 *     ...body...
 *     <div pr-dialog-footer> ...actions... </div>   <!-- was <ng-template pTemplate="footer"> -->
 *   </app-pr-dialog>
 *
 * Encapsulates the overlay/mask/focus/escape behavior in one place (no PrimeNG,
 * no Spartan hlm-dialog which drags in @ng-icons). Rendered inline via @if with a
 * fixed full-screen mask (high z-index) — replaces PrimeNG's appendTo="body".
 *
 * Notes:
 * - PrimeNG-only props (draggable/resizable/appendTo) are intentionally dropped.
 * - Body content is projected as-is; footer goes in a `[pr-dialog-footer]` element.
 */
@Component({
  selector: 'app-pr-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pr-dialog.component.html',
  styleUrl: './pr-dialog.component.scss'
})
export class PrDialogComponent {
  /** Two-way: `[(visible)]`. */
  @Input({ transform: booleanAttribute }) visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  /** Dim + block the background. */
  @Input({ transform: booleanAttribute }) modal = true;
  /** Header title text (ignored when a custom header is projected or showHeader=false). */
  @Input() header = '';
  @Input({ transform: booleanAttribute }) showHeader = true;
  /** Show the built-in × close button. */
  @Input({ transform: booleanAttribute }) closable = true;
  /** Close on Escape key. */
  @Input({ transform: booleanAttribute }) closeOnEscape = true;
  /** Close when clicking the backdrop. */
  @Input({ transform: booleanAttribute }) dismissableMask = false;
  /** Extra class(es) applied to the dialog panel (mirrors PrimeNG styleClass). */
  @Input() styleClass = '';

  /** Emitted after the dialog closes (mirrors PrimeNG onHide). */
  @Output() onHide = new EventEmitter<void>();

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.visibleChange.emit(false);
    this.onHide.emit();
  }

  onMaskClick(): void {
    if (this.dismissableMask) this.hide();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible && this.closeOnEscape) this.hide();
  }
}
