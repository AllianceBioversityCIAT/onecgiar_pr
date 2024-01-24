import { Component } from '@angular/core';

@Component({
  selector: 'app-tor-key-results',
  templateUrl: './tor-key-results.component.html',
  styleUrls: ['./tor-key-results.component.scss']
})
export class TorKeyResultsComponent {
  keyResultsDesc = `This section provides an overview of results reported by the CGIAR Initiative on [Initiative short name]. These results align with the CGIAR Results Framework and [Initiative short name’s] theory of change. Further information on these results is available through the CGIAR Results Dashboard.

  The following diagrams have been produced using quality assessed results entered into the CGIAR reporting system and are based on data extracted on [DATE].`;
}
