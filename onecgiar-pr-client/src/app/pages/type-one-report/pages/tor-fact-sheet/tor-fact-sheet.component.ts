import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
  selector: 'app-tor-fact-sheet',
  templateUrl: './tor-fact-sheet.component.html',
  styleUrls: ['./tor-fact-sheet.component.scss']
})
export class TorFactSheetComponent {
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
      //* Geographic location
      this.concatGeo(data);
      this.concatEoiOutcome(data);
      //(data);
      const genderDescription = 'This score is derived from assessing the Initiative Proposal against adapted OECD gender equity scoring criteria.';
      this.data[9].value = data?.climateGenderScore[0]?.adaptation_score ? `<strong>${data?.climateGenderScore[0]?.adaptation_score}</strong><br>${data?.climateGenderScore[0]?.adaptation_desc}` : '<div class="no-data-text-format">This initiative does not have OECD DAC Climate marker Adaptation score</strong>';
      this.data[10].value = data.climateGenderScore[0]?.mitigation_score ? `<strong>${data.climateGenderScore[0]?.mitigation_score}</strong><br>${data.climateGenderScore[0]?.mitigation_desc}` : '<div class="no-data-text-format">This initiative does not have OECD DAC Climate marker Mitigation score</strong>';
      this.data[11].value = data.climateGenderScore[0]?.gender_score ? `<strong class="tor-fact-desc">${genderDescription}</strong><br><strong>Score ${data.climateGenderScore[0]?.gender_score}</strong><br>${data.climateGenderScore[0]?.gender_desc}` : '<div class="no-data-text-format">This initiative does not have OECD DAC Gender equity marker score</strong>';
      this.data[12].value = data?.web_page ? `<a href="${data?.web_page}" target="_blank">${data?.web_page}</a>` : '<div class="no-data-text-format">This initiative does not have Links to webpage</strong>';
      this.loadingData = false;
    });
  }

  getDateWithFormat(dateString: string) {
    //(dateString);
    const date = new Date(dateString);
    //(date);

    /* const month = date.toLocaleString('default', { month: 'long' });
    const day = date.getDay();
    const year = date.getFullYear(); */
    const yyyy = date.getFullYear();
    let mm: any = date.getMonth() + 1; // Months start at 0!
    let dd: any = date.getDate();
    //(dd + ' ' + mm + ' ' + yyyy);

    if (dd < 10) dd = '0' + dd;
    if (mm < 10) mm = '0' + mm;
    return `${dd}/${mm}/${yyyy}`;
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
    // this.data[7].value += data?.regionsProposal[0]?.name ? data?.regionsProposal[0]?.name : '<div class="no-data-text-format">There are not Regions data</div>';
    if (data.regionsProposal?.length) {
      data.regionsProposal?.forEach(element => {
        this.data[7].value += `${element.name}${'; '}`;
      });
      this.data[7].value = this.data[7].value.substring(0, this.data[7].value.length - 2);
      this.data[7].value += '<br>';
    } else {
      this.data[7].value += '<div class="no-data-text-format">This initiative does not have regions targeted in the proposal</div>';
    }

    //* Countries targeted in the proposal:
    this.data[7].value += '<br><strong>Countries targeted in the proposal:</strong><br>';
    // this.data[7].value += data?.countriesProposal[0]?.name ? data?.countriesProposal[0]?.name : '<div class="no-data-text-format">There are not Countries data</div>';
    if (data.countriesProposal?.length) {
      data.countriesProposal?.forEach(element => {
        this.data[7].value += `${element.name}${'; '}`;
      });
      this.data[7].value = this.data[7].value.substring(0, this.data[7].value.length - 2);
      this.data[7].value += '<br>';
    } else {
      this.data[7].value += '<div class="no-data-text-format">This initiative does not have regions targeted in the proposal</div>';
    }

    // //* Regions with results reported in 2022:
    // this.data[7].value += '<br><strong>Regions with results reported in 2022:</strong><br>';
    // this.data[7].value += data?.regionsReported[0]?.regions ? data?.regionsReported[0]?.regions : '<div class="no-data-text-format">There are not Regions data</div>';
    // this.data[7].value += '<br>';

    // //* Countries with results reported in 2022:
    // this.data[7].value += '<br><strong>Countries with results reported in 2022:</strong><br>';
    // this.data[7].value += data?.countrieReported[0]?.countries ? data?.countrieReported[0]?.countries : '<div class="no-data-text-format">There are not Countries data</div>';
    // this.data[7].value += '<br>';
  }
  concatEoiOutcome(data) {
    data.eoiOutcome?.forEach(element => {
      this.data[8].value += `<strong>${element?.type_name} - ${element?.result_title}</strong><br><strong>Description:</strong> ${element?.result_description}<br><br>`;
    });
    if (!data.eoiOutcome?.length) this.data[8].value += `<div class="no-data-text-format">This initiative does not have a Measurable three-year outcome</div>`;
  }
}
