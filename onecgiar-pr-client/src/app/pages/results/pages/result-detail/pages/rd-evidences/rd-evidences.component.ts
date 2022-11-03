import { Component } from '@angular/core';
import { EvidencesBody } from './model/evidencesBody.model';

@Component({
  selector: 'app-rd-evidences',
  templateUrl: './rd-evidences.component.html',
  styleUrls: ['./rd-evidences.component.scss']
})
export class RdEvidencesComponent {
  evidencesBody = new EvidencesBody();
  constructor() {}
  evidences = [{ name: '' }, { name: '' }];
  ngOnInit(): void {
    this.getSectionInformation();

    this.validateCheckBoxes();
  }
  getSectionInformation() {}
  onSaveSection() {
    console.log(this.evidences);
  }

  addEvidence() {
    console.log('addEvidence');
    this.evidencesBody.aaa.push({});
  }
  addLink() {
    console.log('addLink');
    this.evidencesBody.bbb.push({});
  }

  deleteEvidence(index) {
    console.log('deleteEvidence');
    this.evidencesBody.aaa.splice(index, 1);
  }
  deleteLink(index) {
    console.log('deleteLink');
    this.evidencesBody.bbb.splice(index, 1);
  }
  validateCheckBoxes() {
    console.log(this.evidencesBody.aaa);
    console.log(this.evidencesBody.aaa.some(evidence => evidence.climate === true));
    console.log(this.evidencesBody.aaa.some(evidence => evidence.gender === true));
  }
}
