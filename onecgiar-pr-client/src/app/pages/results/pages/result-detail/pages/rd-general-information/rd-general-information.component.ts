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
  constructor(public api: ApiService, public scoreSE: ScoreService, public institutionsSE: InstitutionsService, public rolesSE: RolesService, public dataControlSE: DataControlService, private customizedAlertsFeSE: CustomizedAlertsFeService, public pusherSE: PusherService) {}
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
      this.generalInfoBody.reporting_year = response['phase_year'];
      this.generalInfoBody.institutions_type = [...this.generalInfoBody.institutions_type, ...this.generalInfoBody.institutions] as any;
      //(this.generalInfoBody);
    });
  }
  onSaveSection() {
    this.generalInfoBody.institutions_type = this.generalInfoBody.institutions_type.filter(inst => !inst.hasOwnProperty('institutions_id'));
    //(this.generalInfoBody);
    this.api.resultsSE.PATCH_generalInformation(this.generalInfoBody).subscribe(
      resp => {
        this.getSectionInformation();
      },
      err => {
        console.error(err);
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
    <li><strong>0 : Not targeted</strong> The activity has been screened against the marker but has not been found to target gender equality.</li>
    <li><strong>1 : Significant</strong> Significant Gender equality is an important and deliberate objective, but not the principal reason for undertaking the activity.</li>
    <li><strong>2 : Principal</strong> Gender equality is the main objective of the activity and is fundamental in its design and expected results. The activity would not have been undertaken without this gender equality objective.</li>
    </ul>`;
  }

  nutritionInformation() {
    return `<strong>Nutrition tag guidance</strong>
    Nutrition, health and food security scores should be determined based on the following: 
    <li><strong>0 : Not targeted</strong> The activity has been screened against the marker but has not been found to target any aspects of nutrition, health and food security.</li>
    <li><strong>1 : Significant</strong> The activity has significant contribution to the above-described aspects of nutrition, health and food security, but not the principal reason for undertaking the activity.</li>
    <li><strong>2 : Principal</strong> The activity is principally meeting any aspects of nutrition, health and food security, and this is fundamental in its design and expected results. The activity would not have been undertaken, without this objective.</li>
    </ul>`;
  }

  environmentInformation() {
    return `<strong>Environment tag guidance</strong> 
    <br>There are five environmental targets and one biodiversity target in the Environmental Health and Biodiversity Impact Area:

    <br><br>Stay within planetary and regional environmental boundaries: consumptive water use in food production of less than 2,500 km3 per year (with a focus on the most stressed basins), zero net deforestation, nitrogen application of 90 Tg per year (with a redistribution towards low-input farming systems) and increased use efficiency; and phosphorus application of 10 Tg per year.

    <br><br>Maintain the genetic diversity of seed varieties, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed genebanks at the national, regional, and international levels.

    <br><br>In addition, water conservation and management, restoration of degraded lands/soils, restoration of biodiversity in situ, and management of pollution related to food systems are key areas of environmental impacts CGIAR to which the CGIAR should contribute. 

    <br><br>Environmental Health and Biodiversity Scores should be determined based on the following: <br>

    <li><strong>0 : Not targeted</strong> The activity has been screened against the marker (see reference list above), but it has not been found to target any aspects of environmental health and biodiversity.</li>
    <li><strong>1 : Significant</strong> The activity has significant contribution to the above-described aspects of environmental health and biodiversity, but not the principal reason of undertaking the activity.</li>
    <li><strong>2 : Principal</strong>  The activity is principally meeting any aspects of environmental health and biodiversity, and this is fundamental in its design and expected results.</li>
   
   `;
  }

  povertyInformation() {
    return `<strong> Poverty tag guidance</strong> 

    <br>There are two poverty reduction, livelihoods and jobs targets in the results framework:

    <br><br>"Lift at least 500 million people living in rural areas above the extreme poverty line of US $1.90 per day (2011 PPP)"

    <br><br>"Reduce by at least half the proportion of men, women and children of all ages living in poverty in all its dimensions, according to national definitions"<br><br>

    <li><strong>0 : Not targeted</strong> The activity has been screened against the marker but has not been found to target gender equality.</li>
    <li><strong>1 : Significant</strong> Significant Gender equality is an important and deliberate objective, but not the principal reason for undertaking the activity.</li>
    <li><strong>2 : Principal</strong> Gender equality is the main objective of the activity and is fundamental in its design and expected results. The activity would not have been undertaken without this gender equality objective.</li>
    `;
  }

  climateInformation() {
    return `<strong>Climate change tag guidance</strong>
    <br>There are three main climate indicators at systems level: 
    <br>- Turn agriculture and forest systems into a net sink for carbon by 2050 (climate mitigation target)
    <br>- Equip 500 million small-scale producers to be more resilient by 2030 (climate adaptation target)
    <br>- Support countries in implementing NAPs and NDCs, and increased ambition in climate actions by 2030 (climate policy target)
    <br>Climate scores should be determined based on the following:
    <ul>
    <strong>Climate scores should be determined based on the following:</strong>
    <li><strong>0 : Not targeted</strong> The activity does not target the climate mitigation, adaptation and climate policy objectives of CGIAR as put forward in its strategy.</li>
    <li><strong>1 : Significant</strong> The activity contributes in a significant way to any of the three CGIAR climate-related strategy objectives – namely, climate mitigation, climate adaptation and climate policy, even though it is not the principal focus of the activity.</li>
    <li><strong>2 : Principal</strong> The activity is principally about meeting any of the three CGIAR climate-related strategy objectives – namely, climate mitigation, climate adaptation and climate policy, and would not have been undertaken without this objective.</li>
    </ul>`;
  }

  sendIntitutionsTypes() {
    //(this.generalInfoBody.institutions_type);
    this.generalInfoBody.institutions_type = this.generalInfoBody.institutions_type.filter(inst => !inst.hasOwnProperty('institutions_id'));
    //(this.generalInfoBody.institutions_type);
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
      description: `As a score of 2 has been selected, you are required to provide evidence of the gender tag in the <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank' class="open_route">Evidence</a> section `,
      querySelector: '#gender_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the climate change tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#climate_change_tag_alert',
      position: 'beforeend'
    });
    // Todo - new fields
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the nutrition tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#nutrition_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the environment and/or biodiversity tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#environment_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the poverty tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#poverty_tag_alert',
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
