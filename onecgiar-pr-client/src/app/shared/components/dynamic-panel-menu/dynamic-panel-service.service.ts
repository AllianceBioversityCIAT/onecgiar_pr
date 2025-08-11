import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DynamicPanelServiceService {
  showCompletePanel = signal(true);

  constructor() {}

  togglePanelView() {
    this.showCompletePanel.set(!this.showCompletePanel());
  }
}
