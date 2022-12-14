import { Component } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { GeneralInfoBody } from './models/generalInfoBody';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { environment } from '../../../../../../../environments/environment';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { PusherService } from '../../../../../../shared/services/pusher.service';

@Component({
  selector: 'app-rd-general-information',
  templateUrl: './rd-general-information.component.html',
  styleUrls: ['./rd-general-information.component.scss']
})
export class RdGeneralInformationComponent {
  generalInfoBody = new GeneralInfoBody();
  toggle = 0;
  constructor(private api: ApiService, public scoreSE: ScoreService, public institutionsSE: InstitutionsService, public rolesSE: RolesService, public dataControlSE: DataControlService, private customizedAlertsFeSE: CustomizedAlertsFeService, public pusherSE: PusherService) {}
  ngOnInit(): void {
    this.showAlerts();
    this.getSectionInformation();
  }
  get disableOptions() {
    return this.generalInfoBody.institutions;
  }
  getSectionInformation() {
    this.api.resultsSE.GET_generalInformationByResultId().subscribe(({ response }) => {
      this.generalInfoBody = response;
      this.generalInfoBody.reporting_year = '2022';
      this.generalInfoBody.institutions_type = [...this.generalInfoBody.institutions_type, ...this.generalInfoBody.institutions] as any;
      // console.log(this.generalInfoBody);
    });
  }
  onSaveSection() {
    this.generalInfoBody.institutions_type = this.generalInfoBody.institutions_type.filter(inst => !inst.hasOwnProperty('institutions_id'));
    console.log(this.generalInfoBody);
    this.api.resultsSE.PATCH_generalInformation(this.generalInfoBody).subscribe(
      resp => {
        this.getSectionInformation();
      },
      err => {
        console.log(err);
        this.getSectionInformation();
      }
    );
  }
  titleTextInfo() {
    return `<ul>
    <li>Provide a clear, informative name of the output, for a non-specialist reader and without acronyms.</li>
    <li>Avoid abbreviations or (technical) jargon.</li>
    </ul>`;
  }
  descriptionTextInfo() {
    return `<ul>
    <li>Ensure the description is understandable for a non-specialist reader.</li>
    <li>Avoid acronyms and technical jargon.</li>
    <li>Avoid repetition of the title.</li>
    </ul>`;
  }
  genderInformation() {
    return `<strong>Gender tag guidance</strong> <ul>
    <li><strong>0 : not targeted</strong> The activity has been screened against the marker but has not been found to target gender equality.</li>
    <li><strong>1 : significant</strong> Significant Gender equality is an important and deliberate objective, but not the principal reason for undertaking the activity.</li>
    <li><strong>2 : principal</strong> Gender equality is the main objective of the activity and is fundamental in its design and expected results. The activity would not have been undertaken without this gender equality objective.</li>
    </ul>`;
  }

  climateInformation() {
    return `<strong>Gender tag and Climate change tag scoring guidance</strong> <ul>
    <li><strong>0 : not targeted</strong> The activity has been screened against the marker but has not been found to target gender equality.</li>
    <li><strong>1 : significant</strong> Significant Gender equality is an important and deliberate objective, but not the principal reason for undertaking the activity.</li>
    <li><strong>2 : principal</strong> Gender equality is the main objective of the activity and is fundamental in its design and expected results. The activity would not have been undertaken without this gender equality objective.</li>
    </ul>`;
  }

  sendIntitutionsTypes() {
    // console.log(this.generalInfoBody.institutions_type);
    this.generalInfoBody.institutions_type = this.generalInfoBody.institutions_type.filter(inst => !inst.hasOwnProperty('institutions_id'));
    // console.log(this.generalInfoBody.institutions_type);
    this.generalInfoBody.institutions_type = [...this.generalInfoBody?.institutions_type, ...this.generalInfoBody?.institutions] as any;
  }
  onChangeKrs() {
    if (this.generalInfoBody.is_krs === false) this.generalInfoBody.krs_url = null;
  }

  onSyncSection() {
    this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
      this.getSectionInformation();
    });
  }

  showAlerts() {
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the gender tag in the <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultId}/evidences" target='_blank' class="open_route">Evidence</a> section `,
      querySelector: '#gender_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the climate change tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultId}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#climate_change_tag_alert',
      position: 'beforeend'
    });
    this.requestEvent();
    try {
      document.getElementById('partnerRequest').addEventListener('click', e => {
        this.api.dataControlSE.showPartnersRequest = true;
      });
    } catch (error) {}
  }

  requestEvent() {
    this.api.dataControlSE.findClassTenSeconds('alert-event').then(resp => {
      try {
        document.querySelector('.alert-event').addEventListener('click', e => {
          this.api.dataControlSE.showPartnersRequest = true;
        });
      } catch (error) {}
    });
  }
}
