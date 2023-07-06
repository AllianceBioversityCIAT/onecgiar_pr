import { Component } from '@angular/core';
import { EvidencesBody } from './model/evidencesBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { empty } from 'rxjs';

@Component({
  selector: 'app-rd-evidences',
  templateUrl: './rd-evidences.component.html',
  styleUrls: ['./rd-evidences.component.scss']
})
export class RdEvidencesComponent {
  links1 = 'https://www.google.com/doodles/dragon-boat-festival-2023';
  links2 = 'http://localhost:4200/result/result-detail/4800/evidences';
  links3 = 'testing';
  links4 = 'texto';
  evidencesBody = new EvidencesBody();
  alertStatus() {
    //(this.api.dataControlSE?.currentResult);
    if (this.api.dataControlSE.isKnowledgeProduct) return 'As this knowledge product is already stored in CGSpace, this section only requires an indication of whether the knowledge product is gender or climate related.';
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
      //(this.evidencesBody);
      //(this.evidencesBody?.gender_tag_level);
      console.log(response);
    });
  }
  onSaveSection() {
    //(this.evidencesBody);
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
    if (!gender_related && this.evidencesBody?.gender_tag_level == '3') text += '<li>At least one of the evidence sources must have the gender checkbox marked if the gender tag has a score of 2.</li>';
    if (!youth_related && this.evidencesBody?.climate_change_tag_level == '3') text += '<li>At least one of the evidence sources must have the climate checkbox marked if the climate change tag has a score of 2.</li>';
    text += '</ul>';
    if (text == '<ul></ul>') return false;
    if (gender_related && youth_related) return false;
    return text;
  }

  get validateCGSpaceLinks() {
    for (const iterator of this.evidencesBody.evidences) {
      if (this.evidencesBody.evidences.find(evidence => !Boolean(evidence.link))) return true;
      const evidencesFinded = this.evidencesBody.evidences.filter(evidence => evidence.link == iterator.link);
      if (evidencesFinded.length >= 2) {
        return evidencesFinded.length >= 2;
      }
    }

    for (const iterator of this.evidencesBody.supplementary) {
      if (this.evidencesBody.supplementary.find(evidence => !Boolean(evidence.link))) return true;
      const supplementaryFinded = this.evidencesBody.supplementary.filter(evidence => evidence.link == iterator.link);
      if (supplementaryFinded.length >= 2) {
        return supplementaryFinded.length >= 2;
      }
    }
    return false;
    // !this.evidencesBody.evidences.every(evidence => evidence?.link?.includes('https://cgspace.cgiar.org') || evidence?.link?.includes('/10568/'));
  }

  //TODO knowledge_product_related, disable field
  OpenKp() {}
}
