import { Component } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-information-center-modal',
  templateUrl: './information-center-modal.component.html',
  styleUrls: ['./information-center-modal.component.scss']
})
export class InformationCenterModalComponent {
  constructor(public api: ApiService) {}
}
