import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';

const TOTAL_FIELDS = 2;

@Component({
  selector: 'app-type-innovation-use',
  imports: [CommonModule, FormsModule],
  templateUrl: './type-innovation-use.component.html',
  styleUrl: './type-innovation-use.component.scss',
})
export class TypeInnovationUseComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);

  body: any = {};
  saving = signal(false);

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    this.api.resultsSE.GET_innovationUse().subscribe(({ response }) => {
      this.body = response || {};
      this.updateMds();
    });
  }

  onSave(): void {
    this.saving.set(true);
    this.api.resultsSE.PATCH_innovationUse(this.body).subscribe({
      next: () => {
        this.loadData();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  updateMds(): void {
    const filled = this.body.innov_use_to_be_determined !== null &&
      this.body.innov_use_to_be_determined !== undefined
      ? (this.body.innov_use_to_be_determined ? 1 : (this.body.actors?.length > 0 ? 2 : 1))
      : 0;
    this.mdsTracker.updateSection('type-specific', filled);
  }
}
