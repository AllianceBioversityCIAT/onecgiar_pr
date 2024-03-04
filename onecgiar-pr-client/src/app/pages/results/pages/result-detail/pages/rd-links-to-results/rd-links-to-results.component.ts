import { Component } from '@angular/core';
import { LinksToResultsGlobalComponent } from '../../../../../../shared/sections-components/links-to-results-global/links-to-results-global.component';

@Component({
  selector: 'app-rd-links-to-results',
  standalone: true,
  templateUrl: './rd-links-to-results.component.html',
  styleUrls: ['./rd-links-to-results.component.scss'],
  imports: [LinksToResultsGlobalComponent]
})
export class RdLinksToResultsComponent {
  constructor() {}
}
