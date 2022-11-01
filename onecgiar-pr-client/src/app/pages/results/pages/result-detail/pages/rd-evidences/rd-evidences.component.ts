import { Component } from '@angular/core';

@Component({
  selector: 'app-rd-evidences',
  templateUrl: './rd-evidences.component.html',
  styleUrls: ['./rd-evidences.component.scss']
})
export class RdEvidencesComponent {
  constructor() {}
  evidences = [{ name: '' }, { name: '' }];
  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  getSectionInformation() {}
  onSaveSection() {
    console.log(this.evidences);
  }
  showAlerts() {}
}
