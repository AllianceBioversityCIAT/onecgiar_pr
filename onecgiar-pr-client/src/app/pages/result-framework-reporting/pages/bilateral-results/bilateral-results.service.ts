import { computed, Injectable, signal } from '@angular/core';
import { CenterDto } from '../../../../shared/interfaces/center.dto';

@Injectable({
  providedIn: 'root'
})
export class BilateralResultsService {
  currentCenterSelected = signal<any>(null);

  centers = signal<CenterDto[]>([]);

  allCenters = computed(() => this.centers().map(center => center.code));
}
