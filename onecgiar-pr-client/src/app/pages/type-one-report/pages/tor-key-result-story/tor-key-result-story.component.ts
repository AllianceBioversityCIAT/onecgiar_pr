import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
  selector: 'app-tor-key-result-story',
  templateUrl: './tor-key-result-story.component.html',
  styleUrls: ['./tor-key-result-story.component.scss']
})
export class TorKeyResultStoryComponent {
  constructor(private api: ApiService, private typeOneReportSE: TypeOneReportService) {}
  tablesList = [];

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.GET_keyResultStoryInitiativeId();
  }

  GET_keyResultStoryInitiativeId() {
    this.api.resultsSE.GET_keyResultStoryInitiativeId(this.typeOneReportSE.getInitiativeID(this.typeOneReportSE.initiativeSelected)?.id).subscribe(({ response }) => {
      console.log(response);
      response.forEach(table => {
        this.formatTable(table);
      });
    });
  }

  formatTable(tableData) {
    let header = [{ attr: 'category' }, { attr: 'value' }];
    let data = [
      { category: 'Result title', value: '' },
      { category: 'Primary submitter', value: '' },
      { category: 'Contributing initiatives', value: '' },
      { category: 'Contributing centers', value: '' },
      { category: 'Contributing external partner(s)', value: '' },
      { category: 'Geographic location', value: '' },
      { category: 'Primary Impact Area', value: '' },
      { category: 'Other relevant Impact Area(s)', value: '' },
      { category: 'Which collective global targets for the relevant Impact Area(s) from the CGIAR 2030 Research and Innovation Strategy does the key result contribute to?', value: '' },
      { category: 'Does this key result build on work or previous results from one or more CRPs?', value: '' }
    ];

    let table = tableData;
    console.log(table);
    if (!table) return (data = null);

    const is_impact = Boolean(Number(table.is_impact));

    data[0].value = table.result_title;
    data[1].value = table.primary_submitter;
    data[2].value = table.contributing_initiative;
    data[3].value = table.contributing_center;
    data[4].value = table.contribution_external_partner;
    const countriesText = `<strong>Countries</strong><br> ${table.countries} <br> `;
    const regionsText = `<strong>Regions</strong>${table.regions}<br> `;
    data[5].value = (table.countries ? countriesText : '') + (table.regions ? regionsText : '');
    data[6].value = table.xxx;
    data[7].value = table.other_relevant_impact_area;
    data[8].value = table.global_target;
    data[9].value = table.web_legacy;

    if (!is_impact) {
      data.splice(8, 1);
      data.splice(7, 1);
      data.splice(6, 1);
    }

    this.tablesList.push({ data, header });
  }
}
