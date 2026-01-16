import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BilateralResultsService {
  currentCenterSelected = signal<any>(null);
}
