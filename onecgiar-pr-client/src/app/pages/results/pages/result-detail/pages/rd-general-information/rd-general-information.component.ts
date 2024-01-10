/* eslint-disable camelcase */
/* eslint-disable arrow-parens */
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { GeneralInfoBody } from './models/generalInfoBody';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { InstitutionsService } from '../../../../../../shared/services/global/institutions.service';
import { environment } from '../../../../../../../environments/environment';
import { RolesService } from '../../../../../../shared/services/global/roles.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { CustomizedAlertsFeService } from '../../../../../../shared/services/customized-alerts-fe.service';
import { PusherService } from '../../../../../../shared/services/pusher.service';
import { CurrentResultService } from '../../../../../../shared/services/current-result.service';

@Component({
  selector: 'app-rd-general-information',
  templateUrl: './rd-general-information.component.html',
  styleUrls: ['./rd-general-information.component.scss']
})
export class RdGeneralInformationComponent implements OnInit {
  generalInfoBody = new GeneralInfoBody();
  toggle = 0;
  isPhaseOpen = false;

  constructor(public api: ApiService, private currentResultSE: CurrentResultService, public scoreSE: ScoreService, public institutionsSE: InstitutionsService, public rolesSE: RolesService, public dataControlSE: DataControlService, private customizedAlertsFeSE: CustomizedAlertsFeService, public pusherSE: PusherService) {}

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
      this.GET_investmentDiscontinuedOptions();
      this.isPhaseOpen = !!this.api?.dataControlSE?.currentResult?.is_phase_open;
    });
  }

  GET_investmentDiscontinuedOptions() {
    this.api.resultsSE.GET_investmentDiscontinuedOptions().subscribe(({ response }) => {
      this.convertChecklistToDiscontinuedOptions(response);
    });
  }

  convertChecklistToDiscontinuedOptions(response) {
    const options = [...response];
    options.forEach(option => {
      const found = this.generalInfoBody.discontinued_options.find(discontinuedOption => discontinuedOption.investment_discontinued_option_id == option.investment_discontinued_option_id);
      if (found) {
        (option.value = true), (option.description = found?.description);
      }
    });
    this.generalInfoBody.discontinued_options = options;
  }

  discontinuedOptionsToIds() {
    this.generalInfoBody.discontinued_options = this.generalInfoBody.discontinued_options.filter(option => option.value === true);
    this.generalInfoBody.discontinued_options.forEach(option => (option.is_active = true));
  }

  onSaveSection() {
    this.discontinuedOptionsToIds();
    this.generalInfoBody.institutions_type = this.generalInfoBody.institutions_type.filter(inst => !inst.hasOwnProperty('institutions_id'));

    if (!this.generalInfoBody.is_discontinued) this.generalInfoBody.discontinued_options = [];
    this.api.resultsSE.PATCH_generalInformation(this.generalInfoBody).subscribe({
      next: resp => {
        this.currentResultSE.GET_resultById();

        this.getSectionInformation();
      },
      error: err => {
        console.error(err);
        this.getSectionInformation();
      }
    });
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
    return `<strong>Gender equality tag guidance</strong> 
    <br/>

    There are two gender-related targets at systems level.

    <ul>
    <li>To close the gender gap in rights to economic resources, access to ownership and control over land and natural resources for over 500 million women who work in food, land and water systems.</li>
    <li>To offer rewardable opportunities to 267 million young people who are not in employment, education or training.</li>
    </ul>

    Three scores are possible:
    <ul>
    <li><strong>0 = Not targeted:</strong>  The output/outcome/activity has been screened against the marker but has not been found to target gender equality.</li>
    <li><strong>1 = Significant:</strong> Gender equality is an important and deliberate objective, but not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> Gender equality is the main objective of the output/outcome/activity and is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this gender equality objective.</li>
    </ul>`;
  }

  nutritionInformation() {
    return `<strong>Nutrition, health and food security tag guidance</strong> 
    <br>
    There are two food security and nutrition targets for at systems level:

    <ul>
      <li>To end hunger for all and enable affordable, healthy diets for the 3 billion people who do not currently have access to safe and nutritious food. </li>
      <li>To reduce cases of foodborne illness (600 million annually) and zoonotic disease (1 billion annually) by one third.</li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target any aspects of nutrition, health and food security.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the above-described aspects of nutrition, health and food security, but nutrition, health and food security is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of nutrition, health and food security, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  environmentInformation() {
    return `<strong>Environmental health and biodiversity tag guidance</strong> 
    <br>
    
    There are three environmental targets and one biodiversity target at systems level:

    <ul>
      <li>Stay within planetary and regional environmental boundaries: consumptive water use in food production of less than 2,500 km³ per year (with a focus on the most stressed basins), zero net deforestation, nitrogen application of 90 Tg per year (with a redistribution towards low-input farming systems) and increased use efficiency; and phosphorus application of 10 Tg per year.</li>
      <li>Maintain the genetic diversity of seed varieties, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed genebanks at the national, regional, and international levels.</li>
      <li>In addition, water conservation and management, restoration of degraded lands/soils, restoration of biodiversity in situ, and management of pollution related to food systems are key areas of environmental impacts to which the CGIAR should contribute. </li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker (see reference list above), but it has not been found to target any aspect of environmental health and biodiversity.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the above-described aspects of environmental health and biodiversity, but environmental health and biodiversity is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of environmental health and biodiversity, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  povertyInformation() {
    return `<strong>Poverty reduction, livelihoods and jobs tag guidance</strong> 
    <br>

    There are two poverty reduction, livelihoods and jobs targets at systems level:
    
    <ul>
      <li>Lift at least 500 million people living in rural areas above the extreme poverty line of US $1.90 per day (2011 PPP).</li>
      <li>Reduce by at least half the proportion of men, women and children of all ages living in poverty in all its dimensions, according to national definitions.</li>
    </ul>
    
    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target any aspects of poverty reduction, livelihoods and jobs.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any aspect of poverty reduction, livelihoods and jobs, but poverty reduction, livelihoods and jobs is not the principal reason for undertaking the output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally meeting any aspect of poverty reduction, livelihoods and jobs, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  climateInformation() {
    return `<strong>Climate change tag guidance</strong>
    <br>
    There are three climate targets at systems level:

    <ul>
      <li>Turn agriculture and forest systems into a net sink for carbon by 2050 (climate mitigation target).</li>
      <li>Equip 500 million small-scale producers to be more resilient by 2030 (climate adaptation target).</li>
      <li>Support countries in implementing NAPs and NDCs, and increased ambition in climate actions by 2030 (climate policy target).</li>
    </ul>

    Three scores are possible:

    <ul>
    <li><strong>0 = Not targeted:</strong> The output/outcome/activity has been screened against the marker but has not been found to target the climate mitigation, adaptation and climate policy objectives of CGIAR as put forward in its strategy.</li>
    <li><strong>1 = Significant:</strong> The output/outcome/activity has made a significant contribution to any of the three CGIAR climate-related strategy objectives – namely, climate mitigation, climate adaptation and climate policy, even though it is not the principal focus of output/outcome/activity.</li>
    <li><strong>2 = Principal:</strong> The output/outcome/activity is principally about meeting any of the three CGIAR climate-related strategy objectives – namely, climate mitigation, climate adaptation and climate policy, and this is fundamental in its design and expected results. The output/outcome/activity would not have been undertaken without this objective.</li>
    </ul>`;
  }

  sendIntitutionsTypes() {
    this.generalInfoBody.institutions_type = [...(this.generalInfoBody?.institutions_type ?? []), ...(this.generalInfoBody?.institutions ?? [])] as any;
  }

  onChangeKrs() {
    if (this.generalInfoBody.is_krs === false) this.generalInfoBody.krs_url = null;
  }

  onSyncSection() {
    const confirmationMessage = `Are you sure you want to sync the information of this result? <br/> Please note that unsaved changes in the section will be lost.`;

    this.customizedAlertsFeSE.show(
      {
        id: 'delete-tab',
        title: 'Sync confirmation',
        description: confirmationMessage,
        status: 'warning',
        confirmText: 'yes, sync information'
      },
      () => {
        this.api.resultsSE.PATCH_resyncKnowledgeProducts().subscribe(resp => {
          this.getSectionInformation();
        });
      }
    );
  }

  showAlerts() {
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the Gender equality tag in the <a href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank' class="open_route">Evidence</a> section `,
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
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the Nutrition, health and food security tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#nutrition_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the Environmental health and biodiversity tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
      querySelector: '#environment_tag_alert',
      position: 'beforeend'
    });
    this.api.alertsFs.show({
      status: 'success',
      title: 'sd',
      description: `As a score of 2 has been selected, you are required to provide evidence of the Poverty reduction, livelihoods and jobs tag in the <a class="open_route" href="${environment.frontBaseUrl}result/result-detail/${this.api.resultsSE.currentResultCode}/evidences" target='_blank'>Evidence</a> section`,
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
