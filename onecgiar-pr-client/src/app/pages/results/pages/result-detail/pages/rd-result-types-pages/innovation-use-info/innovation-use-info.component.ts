import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-innovation-use-info',
  templateUrl: './innovation-use-info.component.html',
  styleUrls: ['./innovation-use-info.component.scss']
})
export class InnovationUseInfoComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  getSectionInformation() {}
  onSaveSection() {}
  showAlerts() {}
}
