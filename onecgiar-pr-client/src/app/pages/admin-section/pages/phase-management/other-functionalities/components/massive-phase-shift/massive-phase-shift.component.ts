import { Component, OnInit } from '@angular/core';
import { ApiService } from 'src/app/shared/services/api/api.service';

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
    this.api.resultsSE.GET_numberOfResultsByResultType(1, 7).subscribe(
      (resp: any) => {
        console.log(resp);
        this.numberOfResults = resp.response.count;
      },
      err => {
        console.log(err);
      }
    );
  }

  accept() {
    this.api.resultsSE.PATCH_versioningAnnually().subscribe(
      (resp: any) => {
        console.log(resp);
      },
      err => {
        console.log(err);
      }
    );
  }
}
