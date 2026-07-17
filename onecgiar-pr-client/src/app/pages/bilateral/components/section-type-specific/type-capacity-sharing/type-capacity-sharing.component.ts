import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';

const TOTAL_FIELDS = 4;

@Component({
  selector: 'app-type-capacity-sharing',
  imports: [CommonModule, FormsModule],
  templateUrl: './type-capacity-sharing.component.html',
  styleUrl: './type-capacity-sharing.component.scss',
})
export class TypeCapacitySharingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly mdsTracker = inject(BilateralMdsTrackerService);

  body: any = {};
  deliveryMethods: any[] = [];
  saving = signal(false);

  ngOnInit(): void {
    this.mdsTracker.setTotalFields('type-specific', TOTAL_FIELDS);
    this.loadData();
  }

  private loadData(): void {
    this.api.resultsSE.GET_capacityDevelopent().subscribe(({ response }) => {
      this.body = response || {};
      this.updateMds();
    });
    this.api.resultsSE.GET_capdevsDeliveryMethod().subscribe(({ response }) => {
      this.deliveryMethods = response || [];
    });
  }

  onSave(): void {
    this.saving.set(true);
    this.api.resultsSE.PATCH_capacityDevelopent(this.body).subscribe({
      next: () => {
        this.loadData();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  updateMds(): void {
    const filled =
      (this.body.female_using != null ? 1 : 0) +
      (this.body.male_using != null ? 1 : 0) +
      (this.body.non_binary_using != null ? 1 : 0) +
      (this.body.capdev_delivery_method_id ? 1 : 0);
    this.mdsTracker.updateSection('type-specific', filled);
  }
}
