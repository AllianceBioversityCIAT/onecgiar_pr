import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-cap-dev-info',
  templateUrl: './cap-dev-info.component.html',
  styleUrls: ['./cap-dev-info.component.scss']
})
export class CapDevInfoComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  getSectionInformation() {}
  onSaveSection() {}
  showAlerts() {}
}
