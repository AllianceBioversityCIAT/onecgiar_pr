import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

@Component({
  selector: 'app-massive-phase-shift',
  templateUrl: './massive-phase-shift.component.html',
  styleUrls: ['./massive-phase-shift.component.scss']
})
export class MassivePhaseShiftComponent implements OnInit {
  requesting = false;
  numberOfResults = 0;
  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.GET_numberOfResultsByResultType();
  }

  GET_numberOfResultsByResultType() {
    this.api.resultsSE.GET_numberOfResultsByResultType(1, 7).subscribe({
      next: (resp: any) => {
        this.numberOfResults = resp.response.count;
      },
      error: err => {}
    });
  }

  accept() {
    this.api.dataControlSE.showMassivePhaseShiftModal = false;
    this.api.dataControlSE.massivePhaseShiftIsRunning = true;
    this.api.resultsSE.PATCH_versioningAnnually().subscribe({
      next: (resp: any) => {
        this.api.dataControlSE.massivePhaseShiftIsRunning = false;
        this.api.alertsFe.show({ id: 'accept', closeIn: 10000, title: 'Process executed successfully', description: this.numberOfResults + ' results of type Innovation Development have been replicated from the previous phase to the current phase.', status: 'success' });
        this.GET_numberOfResultsByResultType();
      },
      error: err => {
        this.api.alertsFe.show({ id: 'PATCH_versioningAnnually', title: 'Process execution failed', description: err?.error?.meesage, status: 'error', closeIn: 500 });
        this.api.dataControlSE.massivePhaseShiftIsRunning = false;
        this.GET_numberOfResultsByResultType();
      }
    });
  }
}
