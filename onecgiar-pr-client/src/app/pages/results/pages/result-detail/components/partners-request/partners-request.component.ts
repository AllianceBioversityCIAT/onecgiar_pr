import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { PartnersRequestBody } from './models/partnersRequestBody.model';

@Component({
  selector: 'app-partners-request',
  templateUrl: './partners-request.component.html',
  styleUrls: ['./partners-request.component.scss']
})
export class PartnersRequestComponent {
  partnersRequestBody = new PartnersRequestBody();
  constructor(public api: ApiService) {}
}
