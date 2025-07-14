/* eslint-disable arrow-parens */
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
    selector: 'app-tor-key-result-story',
    templateUrl: './tor-key-result-story.component.html',
    styleUrls: ['./tor-key-result-story.component.scss'],
    standalone: false
})
export class TorKeyResultStoryComponent implements OnInit {
  constructor(
    public api: ApiService,
    public typeOneReportSE: TypeOneReportService
  ) {}
  tablesList = [];

  ngOnInit(): void {
    this.GET_keyResultStoryInitiativeId();
  }

  GET_keyResultStoryInitiativeId() {
    this.api.resultsSE
      .GET_keyResultStoryInitiativeId(
        this.typeOneReportSE.getInitiativeID(this.typeOneReportSE.initiativeSelected)?.id,
        this.typeOneReportSE.phaseDefaultId
      )
      .subscribe(({ response }) => {
        this.typeOneReportSE.keyResultStoryData = response;
        this.tablesList = [];
        response.forEach(table => {
          this.formatTable(table);
        });
      });
  }

  onSaveSection() {
    this.api.resultsSE.PATCH_primaryImpactAreaKrs(this.typeOneReportSE.keyResultStoryData).subscribe({
      next: resp => {
        this.GET_keyResultStoryInitiativeId();
        this.api.alertsFe.show({
          id: 'save-button',
          title: 'Key result story informaion saved correctly',
          description: '',
          status: 'success',
          closeIn: 500
        });
      },
      error: err => {
        console.error(err);
      }
    });
  }

  formatTable(tableData) {
    const header = [{ attr: 'category' }, { attr: 'value' }];
    let data = [
      { category: 'Result title', value: '', id: null },
      { category: `Contributing initiatives/SGP's/platforms`, value: '' },
      { category: 'Contributing centers', value: '' },
      { category: 'Contributing external partner(s)', value: '' },
      { category: 'Geographic scope', value: '' }
    ];

    const table = tableData;

    if (!table) {
      data = null;
      return;
    }

    data[0].value = table.result_title || '<div class="no-data-text-format">There is no result title data</div>';
    data[0].id = table.result_code;
    data[1].value = table.contributing_initiative || '<div class="no-data-text-format">There are no contributing Initiatives data</div>';
    data[2].value = table.contributing_center || '<div class="no-data-text-format">There are no contributing centers data</div>';
    data[3].value =
      table.contribution_external_partner || '<div class="no-data-text-format">There are no contributing external partner(s) data</div>';
    const countriesText = table.countries ? `<strong>Countries:</strong><br> ${table.countries} <br>` : '';
    const regionsText = table.regions ? `<br><strong>Regions:</strong><br>${table.regions}<br> ` : '';
    data[4].value =
      table.countries || table.regions ? countriesText + regionsText : '<div class="no-data-text-format">There is no Geographic location data</div>';

    this.tablesList.push({ data, header });
  }

  validateOneDropDown() {
    return this.typeOneReportSE.keyResultStoryData.some(item => JSON.parse(item?.impact_areas)?.length);
  }

  alertInformation() {
    return `If no information appears in this section for your initiative, it likely indicates that you haven't enabled any 2022 - 2024 results to be part of the Key Results Story (KRS) in the PRMS. Please reach out to <a class="open_route" href="mailto:prmstechsupport@cgiar.org">prmstechsupport@cgiar.org</a> to enable you to link results to a Key Results Story in the PRMS.`;
  }
}
