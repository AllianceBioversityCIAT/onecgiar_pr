import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { ResultsApiService } from '../api/results-api.service';

@Injectable({
  providedIn: 'root'
})
export class GreenChecksService {
  submit = null;
  constructor(private api: ApiService, private resultsApiSE: ResultsApiService) {}

  updateGreenChecks() {
    setTimeout(() => {
      if (this.resultsApiSE.currentResultId) {
        // this.api.resultsSE.GET_greenChecksByResultId().subscribe(({ response }) => {
        //   console.log('🚀 ~ file: green-checks.service.ts:16 ~ GreenChecksService ~ this.api.resultsSE.GET_greenChecksByResultId ~ response:', response);
        //   this.api.dataControlSE.green_checks = response?.green_checDks;
        // });
        this.api.resultsSE.PATCH_greenChecksByResultId().subscribe(resp => {
          this.api.dataControlSE.green_checks = resp.response.green_checks;
          console.log(resp.response);
          this.submit = Boolean(resp.response?.submit);
        });
      }
    }, 10);
  }

  getGreenChecks() {
    setTimeout(() => {
      if (this.resultsApiSE.currentResultId) {
        this.api.resultsSE.GET_greenChecksByResultId().subscribe(({ response }) => {
          this.api.dataControlSE.green_checks = response.green_checks;
          console.log(this.api.dataControlSE.green_checks);
        });
      }
    }, 10);
  }
}
