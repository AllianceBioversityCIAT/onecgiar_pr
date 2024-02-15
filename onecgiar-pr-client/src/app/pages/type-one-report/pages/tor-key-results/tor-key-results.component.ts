import { Component } from '@angular/core';
import { TypeOneReportService } from '../../type-one-report.service';

@Component({
  selector: 'app-tor-key-results',
  templateUrl: './tor-key-results.component.html',
  styleUrls: ['./tor-key-results.component.scss']
})
export class TorKeyResultsComponent {

  constructor(public typeOneReportSE: TypeOneReportService){
    this.typeOneReportSE.currentBiPage = 3;
    this.typeOneReportSE.sanitizeUrl();
  }
  ngOnDestroy(): void {
    this.typeOneReportSE.currentBiPage = null;
  }

  keyResultsDesc = (name)=> `This section provides an overview of results reported by the CGIAR Initiative on <strong>${name}</strong>. These results align with the CGIAR Results Framework and <strong>${name}</strong> theory of change. Further information on these results is available through the CGIAR Results Dashboard.

  The following diagrams have been produced using quality assessed results entered into the CGIAR reporting system and are based on data extracted on February 20, 2024.`;
}
