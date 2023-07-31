import { Component, OnInit } from '@angular/core';
import { ScoreService } from '../../../../../../shared/services/global/score.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { IpsrGeneralInformationBody } from './model/ipsr-general-information.model';

@Component({
  selector: 'app-ipsr-general-information',
  templateUrl: './ipsr-general-information.component.html',
  styleUrls: ['./ipsr-general-information.component.scss']
})
export class IpsrGeneralInformationComponent {
  ipsrGeneralInformationBody = new IpsrGeneralInformationBody();
  constructor(private api: ApiService, public scoreSE: ScoreService, public ipsrDataControlSE: IpsrDataControlService) {}
  ngOnInit(): void {
    this.getSectionInformation();
    this.api.dataControlSE.detailSectionTitle('General information');
  }
  getSectionInformation() {
    this.ipsrDataControlSE.resultInnovationId;
    this.api.resultsSE.GETInnovationByResultId(this.ipsrDataControlSE.resultInnovationId).subscribe(({ response }) => {
      this.ipsrGeneralInformationBody = response;
      this.ipsrGeneralInformationBody.is_krs = Boolean(Number(this.ipsrGeneralInformationBody.is_krs));
      console.log(response);
    });
  }

  onChangeKrs() {
    if (this.ipsrGeneralInformationBody.is_krs === false) this.ipsrGeneralInformationBody.is_krs = null;
  }
  onSaveSection() {
    this.api.resultsSE.PATCHIpsrGeneralInfo(this.ipsrGeneralInformationBody, this.ipsrDataControlSE.resultInnovationId).subscribe(
      resp => {
        // (resp);
        this.getSectionInformation();
        this.api.alertsFe.show({ id: 'save-button', title: 'Section saved correctly', description: '', status: 'success', closeIn: 500 });
      },
      err => {
        console.error(err);
        this.api.alertsFe.show({ id: 'save-button', title: 'There was an error saving the section', description: '', status: 'error', closeIn: 500 });
      }
    );
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

  nutritionInformation() {
    return `<strong>Nutrition tag guidance</strong> <br>
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

  genderInformation() {
    return `<strong>Gender tag guidance</strong> <ul>
    <li><strong>0 : Not targeted</strong> The activity has been screened against the marker but has not been found to target gender equality.</li>
    <li><strong>1 : Significant</strong> Significant Gender equality is an important and deliberate objective, but not the principal reason for undertaking the activity.</li>
    <li><strong>2 : Principal</strong> Gender equality is the main objective of the activity and is fundamental in its design and expected results. The activity would not have been undertaken without this gender equality objective.</li>
    </ul>`;
  }
}
