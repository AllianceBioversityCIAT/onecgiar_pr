import { Component } from '@angular/core';

@Component({
  selector: 'app-rd-contributors',
  templateUrl: './rd-contributors.component.html',
  styleUrls: ['./rd-contributors.component.scss']
})
export class RdContributorsComponent {
  constructor() {}
  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  getSectionInformation() {}
  onSaveSection() {}
  showAlerts() {}
}
