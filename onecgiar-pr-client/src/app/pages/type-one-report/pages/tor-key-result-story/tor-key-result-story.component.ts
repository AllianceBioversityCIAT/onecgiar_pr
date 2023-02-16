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
  header = [{ attr: 'category' }, { attr: 'value' }];
  data = [
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
  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.GET_keyResultStoryInitiativeId();
  }

  GET_keyResultStoryInitiativeId() {
    this.api.resultsSE.GET_keyResultStoryInitiativeId(this.typeOneReportSE.getInitiativeID(this.typeOneReportSE.initiativeSelected)?.id).subscribe(({ response }) => {
      let data = response[0];
      console.log(data);
      if (!data) return;

      const is_impact = Boolean(Number(data.is_impact));

      this.data[0].value = data.result_title;
      this.data[1].value = data.primary_submitter;
      this.data[2].value = data.contributing_initiative;
      this.data[3].value = data.contributing_center;
      this.data[4].value = data.contribution_external_partner;
      const countriesText = `<strong>Countries</strong><br> ${data.countries} <br> `;
      const regionsText = `<strong>Regions</strong>${data.regions}<br> `;
      this.data[5].value = (data.countries ? countriesText : '') + (data.regions ? regionsText : '');
      this.data[6].value = data.xxx;
      this.data[7].value = data.other_relevant_impact_area;
      this.data[8].value = data.global_target;
      this.data[9].value = data.web_legacy;

      if (!is_impact) {
        this.data.splice(6, 1);
        this.data.splice(7, 1);
        this.data.splice(8, 1);
      }

      // this.value.splice(optionFinded, 1);
    });
  }
}
