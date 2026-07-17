import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';

const TOTAL_FIELDS = 4;

@Component({
  selector: 'app-type-innovation-dev',
  imports: [CommonModule, FormsModule],
  templateUrl: './type-innovation-dev.component.html',
  styleUrl: './type-innovation-dev.component.scss',
})
export class TypeInnovationDevComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);

  body: any = {};
  readinessLevels: any[] = [];
  saving = signal(false);

  readonly typologies = [
    { code: 12, label: 'Product innovation' },
    { code: 13, label: 'Process innovation' },
    { code: 14, label: 'Organizational innovation' },
    { code: 15, label: 'Marketing innovation' },
  ];

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    this.api.resultsSE.GET_innovationDev().subscribe(({ response }) => {
      this.body = response || {};
      this.updateMds();
    });
  }

  onSave(): void {
    this.saving.set(true);
    this.api.resultsSE.PATCH_innovationDev(this.body).subscribe({
      next: () => {
        this.loadData();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  updateMds(): void {
    const filled =
      (this.body.short_title ? 1 : 0) +
      (this.body.innovation_characterization_id ? 1 : 0) +
      (this.body.innovation_readiness_level_id ? 1 : 0) +
      (this.body.innovation_developers?.trim() ? 1 : 0);
    this.mdsTracker.updateSection('type-specific', filled);
  }
}
