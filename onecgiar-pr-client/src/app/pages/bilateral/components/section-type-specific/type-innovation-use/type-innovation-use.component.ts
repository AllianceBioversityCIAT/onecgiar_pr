import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';

const TOTAL_FIELDS = 2;

@Component({
  selector: 'app-type-innovation-use',
  imports: [CommonModule, FormsModule],
  templateUrl: './type-innovation-use.component.html',
  styleUrl: './type-innovation-use.component.scss',
})
export class TypeInnovationUseComponent implements OnInit {
  private readonly bilateralApi = inject(BilateralApiService);
  private readonly creationService = inject(BilateralCreationService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);
  private readonly autoSave = inject(BilateralAutoSaveService);

  body: any = {};
  readonly saving = computed(() => this.autoSave.fieldStatus()['type-specific'] === 'saving');

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    const resultId = this.creationService.currentResultId();
    if (!resultId) return;
    this.bilateralApi.GET_innovationUse(resultId).subscribe(({ response }) => {
      this.body = response || {};
      this.updateMds();
    });
  }

  onFieldChange(): void {
    this.updateMds();
    this.queueTypeSave();
  }

  onSave(): void {
    this.queueTypeSave(0);
  }

  private queueTypeSave(debounceMs = 800): void {
    this.autoSave.schedulePayload('typeSpecific', { ...this.body }, {
      debounceMs,
      statusKey: 'type-specific',
      executor: (resultId, body) => this.bilateralApi.PATCH_innovationUse(resultId, body),
    });
  }

  updateMds(): void {
    const filled =
      this.body.innov_use_to_be_determined !== null && this.body.innov_use_to_be_determined !== undefined
        ? this.body.innov_use_to_be_determined
          ? 1
          : this.body.actors?.length > 0
            ? 2
            : 1
        : 0;
    this.mdsTracker.updateSection('type-specific', filled);
  }
}
