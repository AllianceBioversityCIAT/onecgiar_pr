import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-save-changes-justification-dialog',
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, TextareaModule],
  templateUrl: './save-changes-justification-dialog.component.html',
  styleUrl: '../../result-review-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SaveChangesJustificationDialogComponent {
  @Input() visible: boolean = false;
  @Input() resultCode: string = '';
  @Input() isSaving: boolean = false;
  @Input() justification: string = '';

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() justificationChange = new EventEmitter<string>();
  @Output() cancelEvent = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();

  onCancel(): void {
    if (this.isSaving) return; // Prevent canceling while saving
    this.visibleChange.emit(false);
    this.cancelEvent.emit();
  }

  onConfirm(): void {
    if (!this.justification.trim()) return;
    this.confirm.emit(this.justification);
  }
}
