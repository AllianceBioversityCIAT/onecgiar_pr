import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

@Component({
  selector: 'app-other-functionalities',
  templateUrl: './other-functionalities.component.html',
  styleUrls: ['./other-functionalities.component.scss']
})
export class OtherFunctionalitiesComponent implements OnInit {
  constructor(public api: ApiService) {}
  ngOnInit(): void {}

  execute() {
    this.api.dataControlSE.showMassivePhaseShiftModal = true;
  }
}
