/* eslint-disable arrow-parens */
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
  selector: 'app-tor-fact-sheet',
  templateUrl: './tor-fact-sheet.component.html',
  styleUrls: ['./tor-fact-sheet.component.scss']
})
export class TorFactSheetComponent implements OnInit {
  loadingData = false;
  header = [{ attr: 'category' }, { attr: 'value' }];
  data = [
    { category: 'Initiative name', value: '' },
    { category: 'Initiative short name', value: '' },
    { category: 'Initiative lead', value: '' },
    { category: 'Initiative deputy', value: '' },
    { category: 'Action Area', value: '' },
    { category: 'Start date', value: '' },
    { category: 'End date', value: '' },
    { category: 'Science Group', value: '' },
    // { category: 'Measurable three-year (End of Initiative) outcomes', value: '' },
    { category: 'OECD DAC Climate marker Adaptation score*', value: '' },
    { category: 'OECD DAC Climate marker Mitigation score*', value: '' },
    { category: 'OECD DAC Gender equity marker score', value: '' },
    { category: 'Links to webpage', value: '' }
  ];

  budgetProposal = {
    header: [],
    data: []
  };

  budgetAnaPlan = {
    header: [],
    data: []
  };
  torFactSheetAlertDescription = `
    *The Organisation for Economic Co-operation and Development (OECD) Development Assistance Committee (DAC) markers refer to the OECD DAC Rio Markers for Climate and the gender equality policy marker.
    <br/>
    <br/>
    For climate adaptation and mitigation, scores are: 0 = Not targeted; 1 = Significant; and 2 = Principal.
    <br/>
    <br/>
    The CGIAR GENDER Impact Platform has adapted the OECD gender marker, splitting the 1 score into 1A and 1B. For gender equality, scores are: 0 = Not targeted; 1A = Gender accommodative/aware; 1B = Gender responsive; and 2 = Principal. These scores are derived from Initiative proposals, and refer to the score given to the Initiative overall based on their proposal.`;

  constructor(public api: ApiService, public typeOneReportSE: TypeOneReportService) {}

  ngOnInit(): void {
    this.loadingData = true;
    this.api.resultsSE.GET_factSheetByInitiativeId(this.typeOneReportSE.getInitiativeID(this.typeOneReportSE.initiativeSelected)?.id).subscribe(({ response }) => {
      const data = response;
      this.convertBudgetData(data);
      this.data[0].value = data.initiative_name;
      this.data[1].value = data.short_name;
      this.data[2].value = data.iniative_lead;
      this.data[3].value = data.initiative_deputy;
      this.data[4].value = data.action_area;
      this.data[5].value = data.start_date;
      this.data[6].value = data.end_date;
      this.concatGeo(data);
      this.data[8].value = data?.climateGenderScore[0]?.adaptation_score ? `<strong>${data?.climateGenderScore[0]?.adaptation_score}</strong><br>${data?.climateGenderScore[0]?.adaptation_desc}` : '<div class="no-data-text-format">This Initiative does not have OECD DAC Climate marker Adaptation score</strong>';
      this.data[9].value = data.climateGenderScore[0]?.mitigation_score ? `<strong>${data.climateGenderScore[0]?.mitigation_score}</strong><br>${data.climateGenderScore[0]?.mitigation_desc}` : '<div class="no-data-text-format">This Initiative does not have OECD DAC Climate marker Mitigation score</strong>';
      this.data[10].value = data.climateGenderScore[0]?.gender_score ? `<strong>Score ${data.climateGenderScore[0]?.gender_score}</strong><br>${data.climateGenderScore[0]?.gender_desc}` : '<div class="no-data-text-format">This Initiative does not have OECD DAC Gender equity marker score</strong>';
      this.data[11].value = data?.web_page ? `<a href="${data?.web_page}" target="_blank">${data?.web_page}</a>` : '<div class="no-data-text-format">This Initiative does not have Links to webpage</strong>';
      this.loadingData = false;
    });
  }

  convertBudgetData(data) {
    const convertBudget = (budget, target) => {
      const dataItem = {};
      budget.forEach(element => {
        target.header.push({ attr: element.year, name: element.year, type: 'currency' });
        dataItem[element.year] = element.total;
      });

      target.data.push(dataItem);
    };

    convertBudget(data.budgetProposal, this.budgetProposal);
    convertBudget(
      data.budgetAnaPlan?.filter((_, index) => index !== 1 && index !== 2),
      this.budgetAnaPlan
    );
  }

  concatGeo(data) {
    const regions = data.regionsProposal?.map(element => element.name).join('; ');
    const countries = data.countriesProposal?.map(element => element.name).join('; ');

    this.data[7].value += '<strong>Regions targeted in the proposal:</strong><br>';
    this.data[7].value += regions ? `${regions}<br>` : '<div class="no-data-text-format">This Initiative does not have regions targeted in the proposal</div>';

    this.data[7].value += '<br><strong>Countries targeted in the proposal:</strong><br>';
    this.data[7].value += countries ? `${countries}<br>` : '<div class="no-data-text-format">This Initiative does not have countries targeted in the proposal</div>';
  }

  concatEoiOutcome(data) {
    if (data.eoiOutcome?.length) {
      this.data[8].value = data.eoiOutcome
        .map(element => {
          const { type_name, result_title, result_description } = element;
          return `<strong>${type_name} - ${result_title}</strong><br><strong>Description:</strong> ${result_description}<br><br>`;
        })
        .join('');
    } else {
      this.data[8].value = `<div class="no-data-text-format">This Initiative does not have a Measurable three-year outcome</div>`;
    }
  }
}
