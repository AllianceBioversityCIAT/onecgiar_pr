import { Component } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';
import { LinksToResultsGlobalComponent } from '../../../../../../shared/sections-components/links-to-results-global/links-to-results-global.component';

@Component({
  selector: 'app-ipsr-link-to-results',
  standalone: true,
  templateUrl: './ipsr-link-to-results.component.html',
  styleUrls: ['./ipsr-link-to-results.component.scss'],
  imports: [LinksToResultsGlobalComponent]
})
export class IpsrLinkToResultsComponent {
  constructor(private api: ApiService) {
    this.api.dataControlSE.detailSectionTitle('Step 1');
  }

  onSaveSection() {}
}
