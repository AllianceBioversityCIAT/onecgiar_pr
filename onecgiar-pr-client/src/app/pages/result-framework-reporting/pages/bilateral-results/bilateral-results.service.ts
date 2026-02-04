import { inject, Injectable, signal } from '@angular/core';
import { CenterDto } from '../../../../shared/interfaces/center.dto';
import { ApiService } from '../../../../shared/services/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class BilateralResultsService {
  api = inject(ApiService);

  entityId = signal<string>('');
  entityDetails = signal<any>({});
  centers = signal<CenterDto[]>([]);
  currentCenterSelected = signal<string[]>([]);
  searchText = signal<string>('');
  selectedCenterCode = signal<string | null>(null);

  // Review result drawer
  showReviewDrawer = signal<boolean>(false);
  currentResultToReview = signal<any>(null);

  selectCenter(centerCode: string | null): void {
    if (centerCode === null) {
      this.currentCenterSelected.set(this.centers().map(center => center.code));
    } else {
      this.currentCenterSelected.set([centerCode]);
    }
  }

  getEntityDetails() {
    this.api.resultsSE.GET_ClarisaGlobalUnits(this.entityId()).subscribe(res => {
      this.entityDetails.set(res.response.initiative);
    });
  }
}
