import { Component } from '@angular/core';

@Component({
  selector: 'app-rd-geographic-location',
  templateUrl: './rd-geographic-location.component.html',
  styleUrls: ['./rd-geographic-location.component.scss']
})
export class RdGeographicLocationComponent {
  constructor() {}
  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  getSectionInformation() {}
  onSaveSection() {}
  showAlerts() {}
}
