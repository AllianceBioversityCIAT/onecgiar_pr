import { Component } from '@angular/core';
import { EvidencesBody } from './model/evidencesBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InnovationControlListService } from '../../../../../../shared/services/global/innovation-control-list.service';

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
  readinessLevel: number = 0;
  isOptional: boolean = false;

  alertStatus() {
    if (this.api.dataControlSE.isKnowledgeProduct) return 'As this knowledge product is stored in CGSpace, this section only requires an indication of whether the knowledge product is associated with any of the Impact Area tags provided below.';
    let mainText = '<ul><li>Submit a maximum of 6 pieces of evidence.</li><li>Please list evidence from most to least important.</li><li>Files cannot be uploaded; only links can be entered.</li>';
    if (this.api.dataControlSE?.currentResult?.result_type_id === 5) mainText += '<li>Capacity sharing for development does not currently require evidence submission for quality assurance due to the time/resource burden and potential unresolved General Data Protection Regulation (GDPR) issues.</li><li>By submitting a capacity sharing for development result it is understood that you have evidence to support the result submission, and that should a sub-sample be required this evidence could be made available.</li>';
    mainText += '</ul> ';
    return mainText;
  }
  constructor(public api: ApiService, public innovationControlListSE: InnovationControlListService) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.validateCheckBoxes();
  }

  getSectionInformation() {
    this.api.resultsSE.GET_evidences().subscribe(({ response }) => {
      this.evidencesBody = response;
    });
    this.api.resultsSE.GET_innovationDev().subscribe(({ response }) => {
      this.readinessLevel = this.innovationControlListSE.readinessLevelsList.findIndex(item => item.id == response?.innovation_readiness_level_id);
      this.isOptional = this.readinessLevel === 0;
    });
  }

  onSaveSection() {
    this.api.resultsSE.POST_evidences(this.evidencesBody).subscribe(resp => {
      this.getSectionInformation();
    });
  }

  addEvidence() {
    this.evidencesBody.evidences.push({});
  }

  deleteEvidence(index) {
    this.evidencesBody.evidences.splice(index, 1);
  }

  validateCheckBoxes() {
    let text = '<ul>';
    const gender_related = this.evidencesBody.evidences.some(evidence => evidence.gender_related === true);
    const youth_related = this.evidencesBody.evidences.some(evidence => evidence.youth_related === true);
    const nutrition_related = this.evidencesBody.evidences.some(evidence => evidence.nutrition_related === true);
    const environmental_biodiversity_related = this.evidencesBody.evidences.some(evidence => evidence.environmental_biodiversity_related === true);
    const poverty_related = this.evidencesBody.evidences.some(evidence => evidence.poverty_related === true);

    if (!gender_related && this.evidencesBody?.gender_tag_level == '3' && !this.isOptional) text += '<li>At least one of the evidence sources must have the gender checkbox marked if the gender tag has a score of 2.</li>';
    if (!youth_related && this.evidencesBody?.climate_change_tag_level == '3' && !this.isOptional) text += '<li>At least one of the evidence sources must have the climate checkbox marked if the climate change tag has a score of 2.</li>';
    if (!nutrition_related && this.evidencesBody?.nutrition_tag_level == '3' && !this.isOptional) text += '<li>At least one of the evidence sources must have the nutrition checkbox marked if the nutrition tag has a score of 2.</li>';
    if (!environmental_biodiversity_related && this.evidencesBody?.environmental_biodiversity_tag_level == '3' && !this.isOptional) text += '<li>At least one of the evidence sources must have the environment and/or biodiversity checkbox marked if the environment and/or biodiversity tag has a score of 2.</li>';
    if (!poverty_related && this.evidencesBody?.poverty_tag_level == '3' && !this.isOptional) text += '<li>At least one of the evidence sources must have the poverty checkbox marked if the poverty tag has a score of 2.</li>';

    text += '</ul>';
    if (text == '<ul></ul>') return '';
    if (gender_related && youth_related && nutrition_related && environmental_biodiversity_related && poverty_related) return '';
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

    return false;
  }

  OpenKp() {}
}
