import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-ipsr-link-to-results',
  templateUrl: './ipsr-link-to-results.component.html',
  styleUrls: ['./ipsr-link-to-results.component.scss']
})
export class IpsrLinkToResultsComponent {
  constructor(private api: ApiService) {
    this.api.setTitle('Step 1');
  }
  onSaveSection() {}
}
