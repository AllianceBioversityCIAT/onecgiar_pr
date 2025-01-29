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
  constructor(
    public typeOneReportSE: TypeOneReportService,
    public api: ApiService,
    public exportTablesSE: ExportTablesService
  ) {
    this.typeOneReportSE.currentBiPage = 3;
    this.typeOneReportSE.sanitizeUrl();
  }
  ngOnDestroy(): void {
    this.typeOneReportSE.currentBiPage = null;
  }

  keyResultsDesc(initiativeShortName: string) {
    return `This section provides an overview of results reported by the CGIAR Research Initiative on ${initiativeShortName} from 2022 to 2024. These results align with the CGIAR Results Framework and ${initiativeShortName}’s theory of change. <br/><br/>
    The data used to create the graphics in this section were sourced from the CGIAR Results Dashboard on March 3rd, 2025. These results are accurate as of this date and may differ from information in previous Technical Reports. Such differences may be due to data updates throughout the reporting year, revisions to previously reported results, or updates to the theory of change. <br/><br/>
    If you need assistance selecting graphs for inclusion in your annual technical report, and/or if you require support in developing additional graphs beyond those included in this section, please contact us at <a class="open_route" href="mailto:performanceandresults@cgiar.org" target="_blank">performanceandresults@cgiar.org</a>.`;
  }

  exportExcel(initiativeSelected) {
    this.requesting = true;
    this.api.resultsSE
      .GET_excelFullReportByInitiativeId(this.typeOneReportSE.getInitiativeID(initiativeSelected)?.id, this.typeOneReportSE.phaseDefaultId)
      .subscribe({
        next: ({ response }) => {
          this.exportTablesSE.exportExcel(response, 'Initiative-progress-and-key-results');
          this.requesting = false;
        },
        error: err => {
          console.error(err);
          this.api.alertsFe.show({
            id: 'loginAlert',
            title: 'Oops!',
            description: 'There was an error in the system while generating the report. If the issue persists, please contact the technical team.',
            status: 'error'
          });
        }
      });
  }
}
