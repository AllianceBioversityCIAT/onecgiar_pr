import { Component } from '@angular/core';
import { EvidencesBody } from './model/evidencesBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-rd-evidences',
  templateUrl: './rd-evidences.component.html',
  styleUrls: ['./rd-evidences.component.scss']
})
export class RdEvidencesComponent {
  evidencesBody = new EvidencesBody();
  constructor(private api: ApiService) {}
  ngOnInit(): void {
    this.getSectionInformation();
    this.validateCheckBoxes();
  }
  getSectionInformation() {
    this.api.resultsSE.GET_evidences().subscribe(({ response }) => {
      this.evidencesBody = response;
      console.log(this.evidencesBody);
    });
  }
  onSaveSection() {
    console.log(this.evidencesBody);
    this.api.resultsSE.POST_evidences(this.evidencesBody).subscribe(resp => {
      this.getSectionInformation();
      this.api.alertsFe.show({ id: 'sectionSaved', title: 'Section saved correctly', description: '', status: 'success', closeIn: 500 });
    });
  }

  addEvidence() {
    this.evidencesBody.evidences.push({});
  }
  addLink() {
    this.evidencesBody.supplementary.push({});
  }

  deleteEvidence(index) {
    this.evidencesBody.evidences.splice(index, 1);
  }
  deleteLink(index) {
    this.evidencesBody.supplementary.splice(index, 1);
  }
  validateCheckBoxes() {
    let text = '<ul>';
    const gender_related = this.evidencesBody.evidences.some(evidence => evidence.gender_related === true);
    const youth_related = this.evidencesBody.evidences.some(evidence => evidence.youth_related === true);
    if (!gender_related) text += '<li>At least one of the evidence sources must have the gender checkbox marked if the gender tag has a score of 2.</li>';
    if (!youth_related) text += '<li>At least one of the evidence sources must have the gender youth marked if the gender tag has a score of 2.</li>';
    text += '</ul>';
    if (gender_related && youth_related) return false;
    return text;
  }
}
