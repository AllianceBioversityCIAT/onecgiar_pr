import { Component, Input, OnInit } from '@angular/core';
import { ApiService } from '../../../../../../../shared/services/api/api.service';

@Component({
    selector: 'app-massive-phase-shift',
    templateUrl: './massive-phase-shift.component.html',
    styleUrls: ['./massive-phase-shift.component.scss'],
    standalone: false
})
export class MassivePhaseShiftComponent implements OnInit {
  @Input() replicateIPSR: boolean = false;
  requesting = false;
  numberOfResults = 0;
  numberOfResultsIPSR = 0;

  constructor(public api: ApiService) {}

  ngOnInit(): void {
    this.GET_numberOfResultsByResultType();
    this.GET_numberOfResultsIPSR();
  }

  GET_numberOfResultsByResultType() {
    this.api.resultsSE.GET_numberOfResultsByResultType(1, 7).subscribe({
      next: (resp: any) => {
        this.numberOfResults = resp.response.count;
      },
      error: err => {}
    });
  }

  GET_numberOfResultsIPSR() {
    this.api.resultsSE.GET_numberOfResultsByResultType(1, 10).subscribe({
      next: (resp: any) => {
        this.numberOfResultsIPSR = resp.response.count;
      },
      error: err => {}
    });
  }

  replicateDescription() {
    if (this.replicateIPSR) {
      return `${this.numberOfResultsIPSR} Innovation Packages will be replicated in the active phase, are you sure to execute this action?`;
    }

    return `${this.numberOfResults} Innovation Development type results will be replicated in the active phase, are you sure to execute this action?`;
  }

  accept() {
    this.api.dataControlSE.showMassivePhaseShiftModal = false;
    this.api.dataControlSE.massivePhaseShiftIsRunning = true;
    this.api.resultsSE.PATCH_versioningAnnually(this.replicateIPSR).subscribe({
      next: (resp: any) => {
        this.api.dataControlSE.massivePhaseShiftIsRunning = false;
        const alertDesc = this.replicateIPSR ? 'IPSR replicated' : `${this.numberOfResults} results of type Innovation Development have been replicated from the previous phase to the current phase.`;
        this.api.alertsFe.show({ id: 'accept', closeIn: 10000, title: 'Process executed successfully', description: alertDesc, status: 'success' });
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
