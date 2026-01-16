import { Injectable, signal } from '@angular/core';
import { CenterDto } from '../../../../shared/interfaces/center.dto';

@Injectable({
  providedIn: 'root'
})
export class BilateralResultsService {
  centers = signal<CenterDto[]>([]);

  currentCenterSelected = signal<string[]>([]);

  selectCenter(centerCode: string | null): void {
    if (centerCode === null) {
      this.currentCenterSelected.set(this.centers().map(center => center.code));
    } else {
      this.currentCenterSelected.set([centerCode]);
    }
  }
}
