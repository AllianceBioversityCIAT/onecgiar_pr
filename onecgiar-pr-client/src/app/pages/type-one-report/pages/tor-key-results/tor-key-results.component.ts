import { Component, OnDestroy } from '@angular/core';
import { TypeOneReportService } from '../../type-one-report.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { ExportTablesService } from '../../../../shared/services/export-tables.service';

@Component({
  selector: 'app-tor-key-results',
  templateUrl: './tor-key-results.component.html',
  styleUrls: ['./tor-key-results.component.scss']
})
export class TorKeyResultsComponent implements OnDestroy {
  requesting = false;
  constructor(public typeOneReportSE: TypeOneReportService, public api: ApiService, public exportTablesSE: ExportTablesService) {
    this.typeOneReportSE.currentBiPage = 3;
    this.typeOneReportSE.sanitizeUrl();
  }
  ngOnDestroy(): void {
    this.typeOneReportSE.currentBiPage = null;
  }

  keyResultsDesc = name => `This section provides an overview of results reported by the CGIAR Initiative on <strong>${name}</strong> These results align with the CGIAR Results Framework and <strong>${name}</strong> theory of change.
  The following diagrams have been produced using quality assessed reported results in 2023 and, for certain indicator categories a trend overview of quality assessed results from 2022 and 2023 is presented.<br>
  Further information on these results is available through the <a class="open_route" href="https://www.cgiar.org/food-security-impact/new-results-dashboard/" target="_blank">CGIAR Results Dashboard</a>.`;

  exportExcel(initiativeSelected) {
    this.requesting = true;
    this.api.resultsSE.GET_excelFullReportByInitiativeId(this.typeOneReportSE.getInitiativeID(initiativeSelected)?.id, this.typeOneReportSE.phaseSelected).subscribe({
      next: ({ response }) => {
        this.exportTablesSE.exportExcel(response, 'Initiative-progress-and-key-results');
        this.requesting = false;
      },
      error: err => {
        this.api.alertsFe.show({ id: 'loginAlert', title: 'Oops!', description: 'There was an error in the system while generating the report. If the issue persists, please contact the technical team.', status: 'error' });
      }
    });
  }
}
