import { Component, OnInit } from '@angular/core';
import { EvidencesBody } from './model/evidencesBody.model';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { InnovationControlListService } from '../../../../../../shared/services/global/innovation-control-list.service';
import axios from 'axios';
@Component({
  selector: 'app-rd-evidences',
  templateUrl: './rd-evidences.component.html',
  styleUrls: ['./rd-evidences.component.scss']
})
export class RdEvidencesComponent implements OnInit {
  links1 = 'https://www.google.com/doodles/dragon-boat-festival-2023';
  links2 = 'http://localhost:4200/result/result-detail/4800/evidences';
  links3 = 'testing';
  links4 = 'texto';
  evidencesBody = new EvidencesBody();
  readinessLevel: number = 0;
  isOptional: boolean = false;
  showExample = false;

  alertStatus() {
    if (this.api.dataControlSE.isKnowledgeProduct) return 'As this knowledge product is stored in CGSpace, this section only requires an indication of whether the knowledge product is associated with any of the Impact Area tags provided below.';
    let mainText = '<ul><li>Submit a maximum of 6 pieces of evidence.</li><li>Please list evidence from most to least important.</li><li>Files can be uploaded.</li>';
    if (this.api.dataControlSE?.currentResult?.result_type_id === 5) mainText += '<li>Capacity sharing for development does not currently require evidence submission for quality assurance due to the time/resource burden and potential unresolved General Data Protection Regulation (GDPR) issues.</li><li>By submitting a capacity sharing for development result it is understood that you have evidence to support the result submission, and that should a sub-sample be required this evidence could be made available.</li>';
    mainText += '</ul> ';
    return mainText;
  }
  constructor(public api: ApiService, public innovationControlListSE: InnovationControlListService) {}

  ngOnInit(): void {
    this.getSectionInformation();
    this.validateCheckBoxes();

    console.log(2);
    document.onkeyup = () => {
      var e = e || window.event; // for IE to cover IEs window event-object
      if (e.altKey && e.which == 83) {
        console.log('event');
        this.showExample = true;
      }
    };
  }

  filExample = null;

  withaxios() {
    let element = document.getElementById('linku') as HTMLInputElement;
    let value = element.value;

    axios({
      method: 'put',
      url: value,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Content-Range': `bytes 0-${this.filExample.size - 1}/${this.filExample.size}`,
        eampleee: 'asasas'
      },
      data: this.filExample
    })
      .then(response => {
        console.log('Solicitud exitosa:', response.data);
      })
      .catch(error => {
        console.log('%c ' + error.response.data.error.message, 'background: #ffffff; color: #ff0000');

        console.error('Error en la solicitud:', error.response.data.error.message);
      });
  }

  async saveExample() {
    this.withaxios();
    this.api.resultsSE.saveFileExample(this.filExample).subscribe(resp => {
      console.log(resp);
    });
  }

  onFileSelected(event: any) {
    this.filExample = event.target.files[0];
  }

  getSectionInformation() {
    this.api.resultsSE.GET_evidences().subscribe(({ response }) => {
      this.evidencesBody = response;
      this.readinessLevel = this.innovationControlListSE.readinessLevelsList.findIndex(item => item.id == response?.innovation_readiness_level_id);
      this.isOptional = Boolean(this.readinessLevel === 0);
      console.log(this.evidencesBody.evidences);
    });
  }

  underConstructionText() {
    return 'This current section is undergoing improvement, and you will notice new options that are still on internal testing. Despite this ongoing process, please continue reporting evidence as usual by selecting <strong>"Link"</strong> as the evidence type.';
  }

  onSaveSection() {
    console.log(this.evidencesBody);
    this.api.resultsSE.POST_evidences(this.evidencesBody).subscribe(resp => {
      this.getSectionInformation();
    });
  }

  addEvidence() {
    this.evidencesBody.evidences.push({ is_sharepoint: false });
  }

  deleteEvidence(index) {
    this.evidencesBody.evidences.splice(index, 1);
  }

  validateCheckBoxes() {
    const tags = [
      { tag: 'gender', level: this.evidencesBody?.gender_tag_level, related: 'gender_related' },
      { tag: 'climate change', level: this.evidencesBody?.climate_change_tag_level, related: 'youth_related' },
      { tag: 'nutrition', level: this.evidencesBody?.nutrition_tag_level, related: 'nutrition_related' },
      { tag: 'environment', level: this.evidencesBody?.environmental_biodiversity_tag_level, related: 'environmental_biodiversity_related' },
      { tag: 'poverty', level: this.evidencesBody?.poverty_tag_level, related: 'poverty_related' }
    ];

    const evidences = this.evidencesBody.evidences;
    const hasTagRelated = (related: string) => evidences.some(evidence => evidence[related]);

    const text = tags
      .filter(({ level, related }) => level === '3' && !hasTagRelated(related))
      .map(({ tag }) => `<li>At least one of the evidence sources must have the ${tag} checkbox marked if the ${tag} tag has a score of 2.</li>`)
      .join('');

    if (!text) {
      return '';
    }

    const allTagsRelated = tags.every(({ related }) => hasTagRelated(related));

    if (!allTagsRelated) {
      this.isOptional = false;
    }

    return `<ul>${text}</ul>`;
  }
  get validateCGSpaceLinks() {
    for (const evidenteIterator of this.evidencesBody.evidences) {
      if (this.evidencesBody.evidences.find(evidence => !Boolean(evidence.link) && !evidence.is_sharepoint)) return true;
      const evidencesFinded = this.evidencesBody.evidences.filter(evidence => evidence.link == evidenteIterator.link && !evidence.is_sharepoint);
      if (evidencesFinded.length >= 2) {
        return true;
      }
      if (evidenteIterator.is_sharepoint && !(evidenteIterator?.file || evidenteIterator?.link)) {
        return true;
      }
    }

    return false;
  }

  OpenKp() {}
}
