import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../shared/services/api/api.service';

@Component({
  selector: 'app-innovation-package-creator',
  templateUrl: './innovation-package-creator.component.html',
  styleUrls: ['./innovation-package-creator.component.scss']
})
export class InnovationPackageCreatorComponent {
  constructor(public api: ApiService) {}
}
