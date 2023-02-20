import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
  selector: 'app-tor-fact-sheet',
  templateUrl: './tor-fact-sheet.component.html',
  styleUrls: ['./tor-fact-sheet.component.scss']
})
export class TorFactSheetComponent {
  header = [{ attr: 'category' }, { attr: 'value' }];
  data = [
    { category: 'Initiative name', value: '' },
    { category: 'Initiative short name', value: '' },
    { category: 'Initiative lead', value: '' },
    { category: 'Initiative deputy', value: '' },
    { category: 'Action Area', value: '' },
    { category: 'Start date', value: 'Day/Month/Year (to be filled)' },
    { category: 'End date', value: 'Day/Month/Year (to be filled)' },
    { category: 'Geographic location', value: '' },
    { category: 'Measurable three-year (End of Initiative) outcomes', value: '' },
    { category: 'OECD DAC Climate marker Adaptation score', value: '' },
    { category: 'OECD DAC Climate marker Mitigation score', value: '' },
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

  constructor(private api: ApiService, private typeOneReportSE: TypeOneReportService) {}
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.api.resultsSE.GET_factSheetByInitiativeId(this.typeOneReportSE.getInitiativeID(this.typeOneReportSE.initiativeSelected)?.id).subscribe(({ response }) => {
      let data = response;
      this.convertBudgetData(data);
      this.data[0].value = data.initiative_name;
      this.data[1].value = data.short_name;
      this.data[2].value = data.iniative_lead;
      this.data[3].value = data.initiative_deputy;
      this.data[4].value = data.action_area;
      this.data[5].value = this.getDateWithFormat(data.start_date);
      this.data[6].value = this.getDateWithFormat(data.end_date);
      //* Geographic location
      this.concatGeo(data);
      this.concatEoiOutcome(data);
      console.log(data);
      this.data[9].value = `<strong>${data?.climateGenderScore[0]?.adaptation_score}</strong><br>${data?.climateGenderScore[0]?.adaptation_desc}`;
      this.data[10].value = `<strong>${data.climateGenderScore[0]?.mitigation_score}</strong><br>${data.climateGenderScore[0]?.mitigation_desc}`;
      this.data[11].value = `<strong>${data.climateGenderScore[0]?.gender_score}</strong><br>${''}`;
      this.data[12].value = `<a href="${data?.web_page}" target="_blank">${data?.web_page}</a>`;
    });
  }

  getDateWithFormat(dateString: string) {
    console.log(dateString);
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDay();
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }

  convertBudgetData(data) {
    //* budgetProposal
    let dataItem = {};
    data.budgetProposal?.forEach(element => {
      this.budgetProposal.header.push({ attr: element.year, name: element.year, type: 'currency' });
      dataItem[element.year] = element.total;
    });
    this.budgetProposal.data.push(dataItem);
    //* budgetAnaPlan
    dataItem = {};
    data.budgetAnaPlan.splice(2, 1);
    data.budgetAnaPlan.splice(1, 1);
    data.budgetAnaPlan?.forEach(element => {
      this.budgetAnaPlan.header.push({ attr: element.year, name: element.year, type: 'currency' });
      dataItem[element.year] = element.total;
    });
    this.budgetAnaPlan.data.push(dataItem);
  }

  concatGeo(data) {
    //* Regions targeted in the proposal:
    this.data[7].value += '<strong>Regions targeted in the proposal:</strong><br>';
    this.data[7].value += data?.regionsProposal[0]?.name;
    this.data[7].value += '.<br>';

    //* Countries targeted in the proposal:
    this.data[7].value += '<br><strong>Countries targeted in the proposal:</strong><br>';
    this.data[7].value += data?.countriesProposal[0]?.name;
    this.data[7].value += '.<br>';

    //* Regions with results reported in 2022:
    this.data[7].value += '<br><strong>Regions with results reported in 2022:</strong><br>';
    this.data[7].value += data?.regionsReported[0]?.regions;
    this.data[7].value += '.<br>';

    //* Countries with results reported in 2022:
    this.data[7].value += '<br><strong>Countries with results reported in 2022:</strong><br>';
    this.data[7].value += data?.countrieReported[0]?.regions;
    this.data[7].value += '.<br>';
  }
  concatEoiOutcome(data) {
    data.eoiOutcome?.forEach(element => {
      this.data[8].value += `<strong>${element?.type_name} - ${element?.result_title}</strong><br>${element?.result_description}<br><br>`;
    });
  }
}
