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
  alertStatus() {
    // console.log(this.api.dataControlSE?.currentResult);
    let mainText = '<ul><li>Submit a maximum of 3 pieces of evidence.</li><li>Please list evidence from most to least important.</li><li>Files cannot be uploaded; only links can be entered.</li>';
    if (this.api.dataControlSE?.currentResult?.result_type_id === 5) mainText += '<li>Capacity development do not currently require evidence submission for QA due to the time/resource burden and unresolved potential GDPR issues</li><li>By submitting a cap dev result is it understood that you have evidence available to support the result submission, and that should a sub-sample be required this evidence could be made available</li>';
    mainText += '</ul> ';
    return mainText;
  }
  constructor(public api: ApiService) {}
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
    if (!youth_related) text += '<li>At least one of the evidence sources must have the climate checkbox marked if the climate change tag has a score of 2.</li>';
    text += '</ul>';
    if (gender_related && youth_related) return false;
    return text;
  }

  get validateCGSpaceLinks() {
    for (const iterator of this.evidencesBody.evidences) {
      const evidencesFinded = this.evidencesBody.evidences.filter(evidence => evidence.link == iterator.link);

      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }
    return false;
    // !this.evidencesBody.evidences.every(evidence => evidence?.link?.includes('https://cgspace.cgiar.org') || evidence?.link?.includes('/10568/'));
  }

  //TODO knowledge_product_related, disable field
  OpenKp() {}
}
