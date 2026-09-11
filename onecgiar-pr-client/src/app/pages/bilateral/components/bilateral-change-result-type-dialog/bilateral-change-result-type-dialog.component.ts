import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan/button';
import { PrDialogComponent } from '../../../../shared/components/pr-dialog/pr-dialog.component';
import { BilateralApiService } from '../../../../shared/services/api/bilateral-api.service';

interface ResultTypeOption {
  id: number;
  levelId: number;
  label: string;
  levelLabel: string;
}

const W3_RESULT_TYPES: ResultTypeOption[] = [
  { id: 1, levelId: 3, label: 'Policy Change', levelLabel: 'Initiative Outcome' },
  { id: 2, levelId: 3, label: 'Innovation Use', levelLabel: 'Initiative Outcome' },
  { id: 4, levelId: 3, label: 'Other Outcome', levelLabel: 'Initiative Outcome' },
  { id: 5, levelId: 4, label: 'Capacity Sharing for Development', levelLabel: 'Initiative Output' },
  { id: 6, levelId: 4, label: 'Knowledge Product', levelLabel: 'Initiative Output' },
  { id: 7, levelId: 4, label: 'Innovation Development', levelLabel: 'Initiative Output' },
  { id: 8, levelId: 4, label: 'Other Output', levelLabel: 'Initiative Output' },
];

@Component({
  selector: 'app-bilateral-change-result-type-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmButton, PrDialogComponent],
  templateUrl: './bilateral-change-result-type-dialog.component.html',
  styleUrl: './bilateral-change-result-type-dialog.component.scss',
})
export class BilateralChangeResultTypeDialogComponent {
  private readonly bilateralApi = inject(BilateralApiService);
  @Input({ required: true }) resultId!: number;
  @Input({ required: true }) currentTypeId!: number | null;
  @Input({ required: true }) currentLevelId!: number | null;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() changed = new EventEmitter<void>();
  readonly options = W3_RESULT_TYPES;
  selected: ResultTypeOption | null = null;
  justification = '';
  handle = '';
  submitting = false;
  errorMessage = '';

  close(): void {
    if (this.submitting) return;
    this.visible = false;
    this.selected = null;
    this.justification = '';
    this.handle = '';
    this.errorMessage = '';
    this.visibleChange.emit(false);
  }
  select(option: ResultTypeOption): void {
    if (!this.isCurrent(option)) {
      this.selected = option;
      this.errorMessage = '';
    }
  }

  isCurrent(option: ResultTypeOption): boolean {
    return option.id === this.currentTypeId && option.levelId === this.currentLevelId;
  }
  requiresHandle(): boolean { return this.selected?.id === 6; }
  canSubmit(): boolean {
    return !!this.selected && !!this.justification.trim() &&
      (!this.requiresHandle() || !!this.handle.trim()) && !this.submitting;
  }
  submit(): void {
    if (!this.canSubmit() || !this.selected) return;
    this.submitting = true;
    this.errorMessage = '';
    const body: Record<string, string | number> = {
      result_level_id: this.selected.levelId,
      result_type_id: this.selected.id,
      justification: this.justification.trim(),
    };
    if (this.requiresHandle()) body['handle'] = this.handle.trim();
    this.bilateralApi.PATCH_changeBilateralResultType(this.resultId, body).subscribe({
      next: () => {
        this.submitting = false;
        this.close();
        this.changed.emit();
      },
      error: error => {
        this.submitting = false;
        this.errorMessage = error?.error?.message ??
          'The result type could not be changed. Please try again.';
      },
    });
  }
}
