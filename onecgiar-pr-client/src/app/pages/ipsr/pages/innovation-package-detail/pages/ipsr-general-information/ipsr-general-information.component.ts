import { Component, OnInit, effect, inject } from '@angular/core';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { IpsrGeneralInformationBody } from './model/ipsr-general-information.model';
import { User } from '../../../../../results/pages/result-detail/pages/rd-general-information/models/userSearchResponse';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { UserSearchService } from '../../../../../results/pages/result-detail/pages/rd-general-information/services/user-search-service.service';
import { DataControlService } from '../../../../../../shared/services/data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';
import { GetImpactAreasScoresService } from '../../../../../../shared/services/global/get-impact-areas-scores.service';
import { environment } from '../../../../../../../environments/environment';

@Component({
  selector: 'app-ipsr-general-information',
  templateUrl: './ipsr-general-information.component.html',
  styleUrls: ['./ipsr-general-information.component.scss'],
  standalone: false
})
export class IpsrGeneralInformationComponent implements OnInit {
  ipsrGeneralInformationBody = new IpsrGeneralInformationBody();

  dataControlSE = inject(DataControlService);
  fieldsManagerSE = inject(FieldsManagerService);
  getImpactAreasScoresComponents = inject(GetImpactAreasScoresService);

  constructor(
    public api: ApiService,
    public scoreSE: ScoreService,
    public ipsrDataControlSE: IpsrDataControlService,
    private userSearchService: UserSearchService
  ) {}

  ngOnInit(): void {
    if (this.fieldsManagerSE.isP25()) {
      setTimeout(() => {
        this.showAlerts();
      }, 100);
    }
    this.getSectionInformation();
    this.api.dataControlSE.detailSectionTitle('General information');
  }

  getSectionInformationp25() {}

  getSectionInformation() {
    this.api.resultsSE.GETInnovationByResultId(this.ipsrDataControlSE.resultInnovationId, this.fieldsManagerSE.isP25()).subscribe(({ response }) => {
      this.ipsrGeneralInformationBody = response;
    });
  }

  GET_investmentDiscontinuedOptions(result_type_id) {
    this.api.resultsSE.GET_investmentDiscontinuedOptions(result_type_id).subscribe(({ response }) => {
      this.convertChecklistToDiscontinuedOptions(response);
    });
  }

  convertChecklistToDiscontinuedOptions(response) {
    const options = [...response];
    options.forEach(option => {
      const found = this.ipsrGeneralInformationBody.discontinued_options.find(
        discontinuedOption => discontinuedOption.investment_discontinued_option_id == option.investment_discontinued_option_id
      );
      if (found) {
        option.value = true;
        option.description = found?.description;
      }
    });
    this.ipsrGeneralInformationBody.discontinued_options = options;
  }

  onChangeKrs() {
    if (this.ipsrGeneralInformationBody.is_krs === false) this.ipsrGeneralInformationBody.is_krs = null;
  }

  descriptionTextInfo() {
    return `<ul>
    <li>Ensure the description is understandable for a non-specialist reader.</li>
    <li>Avoid acronyms and technical jargon.</li>
    <li>Avoid repetition of the title.</li>
    </ul>`;
  }

  onSaveSection() {
    if (this.userSearchService.searchQuery.trim() && !this.userSearchService.selectedUser) {
      this.userSearchService.hasValidContact = false;
      this.userSearchService.showContactError = true;
      return;
    }

    this.api.resultsSE
      .PATCHIpsrGeneralInfo(this.ipsrGeneralInformationBody, this.ipsrDataControlSE.resultInnovationId, this.fieldsManagerSE.isP25())
      .subscribe({
        next: resp => {
          this.getSectionInformation();
        },
        error: err => {
          console.error(err);
          this.getSectionInformation();
        }
      });
  }

  climateInformation() {
    if (this.fieldsManagerSE.isP25()) {
      return `<strong>Climate adaptation and mitigation</strong>

      <ul>
        <li><strong>Example topics:</strong> Generating scientific evidence on the impact of climate change on food, land and water systems, and vice-versa; developing evidence-based solutions that support climate action, including via policies, institutions and finance; enhancing adaptive capacity of small-scale producers while reducing GHG emissions/carbon footprints; providing affordable, accessible climate-informed services; developing climate-resilient crop varieties and breeds; securing genetic resources for future climate needs; and improving methods (e.g. for modeling, forecasts). </li>
        <li><strong>Collective global targets:</strong>
          <ul>
            <li>Turn agriculture and forest systems into a net sink for carbon by 2050.</li>
            <li>Equip 500 million small-scale producers to be more resilient by 2030.</li>
            <li>Support countries in implementing National Adaptation Plans and Nationally Determined Contributions, and increased ambition in climate actions by 2030. education or training.</li>
          </ul>
        </li>
      </ul>`;
    }

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

  nutritionInformation() {
    if (this.fieldsManagerSE.isP25()) {
      return `<strong>Nutrition, health and food security</strong>

      <ul>
        <li><strong>Example topics:</strong> Improving diets, nutrition, and food security (affordability, accessibility, desirability, stability); human health; and managing zoonotic diseases, food safety, and anti-microbial resistance.</li>
        <li>
          <strong>Collective global targets:</strong>
          <ul>
            <li>To end hunger for all and enable affordable, healthy diets for the 3 billion people who do not currently have access to safe and nutritious food.</li>
            <li>To reduce cases of foodborne illness (600 million annually) and zoonotic disease (1 billion annually) by one third.</li>
          </ul>
        </li>
      </ul>`;
    }

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
    if (this.fieldsManagerSE.isP25()) {
      return `<strong>Environmental health and biodiversity</strong>

      <ul>
        <li><strong>Example topics:</strong> Supporting actions to stay within planetary boundaries for natural resource use and biodiversity through digital tools; improving management of water, land, soil, nutrients, waste, and pollution, including through nature-based, ecosystem-based, and agroecological approaches; conserving biodiversity through ex situ facilities (e.g. genebanks, community seed-banks) or in situ conservation areas; and breeding to reduce environmental footprint.</li>
        <li><strong>Collective global targets:</strong>
          <ul>
            <li>Stay within planetary and regional environmental boundaries: consumptive water use in food production of less than 2,500 km3 per year (with a focus on the most stressed basins), zero net deforestation, nitrogen application of 90 Tg per year (with a redistribution towards low-input farming systems) and increased use efficiency; and phosphorus application of 10 Tg per year.</li>
            <li>Maintain the genetic diversity of seed varieties, cultivated plants and farmed and domesticated animals and their related wild species, including through soundly managed genebanks at the national, regional, and international levels.</li>
          </ul>
        </li>
      </ul>`;
    }

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
    if (this.fieldsManagerSE.isP25()) {
      return `<strong>Poverty reduction, livelihoods and jobs</strong>

      <ul>
        <li><strong>Example topics:</strong> Improving social protection and employment opportunities by supporting access to resources and markets; developing solutions for resilient, income-generating agriculture for small farmers; and reducing poverty through adoption of new varieties and breeds with better yields.</li>
        <li><strong>Collective global targets:</strong>
          <ul>
            <li>Lift at least 500 million people living in rural areas above the extreme poverty line of US $1.90 per day (2011 PPP).</li>
            <li>Reduce by at least half the proportion of men, women and children of all ages living in poverty in all its dimensions, according to national definitions.</li>
          </ul>
        </li>
      </ul>`;
    }

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

  genderInformation() {
    if (this.fieldsManagerSE.isP25()) {
      return `<strong>Gender equality, youth and social inclusion</strong>
      <br/>

      <ul>
        <li><strong>Example topics:</strong> Empowering women and youth, encouraging women and youth entrepreneurship, and addressing socio-political barriers to social inclusion in food systems; ensuring equal access to resources; and meeting the specific crop and breed requirements and preferences of women, youth, and disadvantaged groups.</li>
        <li><strong>Collective global targets:</strong>
          <ul>
            <li>To close the gender gap in rights to economic resources, access to ownership and control over land and natural resources for over 500 million women who work in food, land and water systems.</li>
            <li>To offer rewardable opportunities to 267 million young people who are not in employment, education or training.</li>
          </ul>
        </li>
        <li><strong>Note:</strong> Specific enhanced instructions related to scoring for gender equality, elaborated by the GENDER Platform, are available <a href="https://cgiar.sharepoint.com/:b:/r/sites/WGonpoolednon-pooledalignment/Shared%20Documents/General/QA/CGIAR%20Technical%20Reporting%20Guidance%20for%20Impact%20Area%20Scoring.pdf?csf=1&web=1&e=CFLArZ" target="_blank" rel="noopener noreferrer">here</a>.</li>
      </ul>`;
    }

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

  impactAreaScoresInfo() {
    return `Provide a score (0, 1 or 2) indicating the relevance of the result for each of the 5 Impact Areas (IAs). IA scores are defined as follows:
    <br/>
    <br/>

    <strong>0 = Not targeted:</strong> The result has been screened against the IA but it has not been found to directly contribute to any aspect of the IA as it is outlined in the CGIAR 2030 Research and Innovation Strategy. <br/>
    <strong>1 = Significant:</strong> The result directly contributes to one or more aspects of the IA. However, contributing to the IA is not the principal objective of the result. <br/>
    <strong>2 = Principal:</strong> Contributing to one or more aspects of the IA is the principal objective of the result. The IA is fundamental to the design of the activity leading to the result; the activity would not have been undertaken without this objective.

    <br/>
    <br/>

    <strong>Notes:</strong>
    <ul>
    <li>Every result should have at least one score of 1 or 2. Results with scores of 0 for all IAs should be rare cases.</li>
    <li>No more than two IAs should receive scores of 2 for a given result. Results with three IAs with scores of 2 should be rare cases.</li>
    <li>Scores should not be assigned solely based on relevance to the collective global targets, but rather to the IA as more broadly defined in the 2030 Strategy and by the IA Platforms, indicated below.</li>
    <li>Scoring should be based on the relevance of the IAs to a given result and not on other criteria such as a specific donor's level of interest in an IA.</li>
    </ul>`;
  }

  showAlerts() {
    try {
      this.api.alertsFs.show({
        status: 'success',
        title: 'sd',
        description: `As a score of 2 has been selected, you are required to provide evidence of the Gender equality tag in the <a href="${environment.frontBaseUrl}ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/general-information" target='_blank' class="open_route">Evidence</a> section `,
        querySelector: '#gender_tag_alert',
        position: 'beforeend'
      });
      this.api.alertsFs.show({
        status: 'success',
        title: 'sd',
        description: `As a score of 2 has been selected, you are required to provide evidence of the climate change tag in the <a class="open_route" href="${environment.frontBaseUrl}ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/general-information" target='_blank'>Evidence</a> section`,
        querySelector: '#climate_change_tag_alert',
        position: 'beforeend'
      });
      this.api.alertsFs.show({
        status: 'success',
        title: 'sd',
        description: `As a score of 2 has been selected, you are required to provide evidence of the Nutrition, health and food security tag in the <a class="open_route" href="${environment.frontBaseUrl}ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/general-information" target='_blank'>Evidence</a> section`,
        querySelector: '#nutrition_tag_alert',
        position: 'beforeend'
      });
      this.api.alertsFs.show({
        status: 'success',
        title: 'sd',
        description: `As a score of 2 has been selected, you are required to provide evidence of the Environmental health and biodiversity tag in the <a class="open_route" href="${environment.frontBaseUrl}ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/general-information" target='_blank'>Evidence</a> section`,
        querySelector: '#environment_tag_alert',
        position: 'beforeend'
      });
      this.api.alertsFs.show({
        status: 'success',
        title: 'sd',
        description: `As a score of 2 has been selected, you are required to provide evidence of the Poverty reduction, livelihoods and jobs tag in the <a class="open_route" href="${environment.frontBaseUrl}ipsr/detail/${this.ipsrDataControlSE.resultInnovationCode}/general-information" target='_blank'>Evidence</a> section`,
        querySelector: '#poverty_tag_alert',
        position: 'beforeend'
      });
    } catch (error) {
      console.error('Error showing alerts:', error);
    }
  }
}
