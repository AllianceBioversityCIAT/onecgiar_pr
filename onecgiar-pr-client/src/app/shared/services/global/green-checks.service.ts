import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { ResultsApiService } from '../api/results-api.service';

@Injectable({
  providedIn: 'root'
})
export class GreenChecksService {
  submit = null;
  constructor(private readonly api: ApiService, private readonly resultsApiSE: ResultsApiService) {}

  updateGreenChecks() {
    setTimeout(() => {
      if (this.resultsApiSE.currentResultId) {
        this.api.resultsSE.PATCH_greenChecksByResultId().subscribe(resp => {
          this.api.dataControlSE.green_checks = resp.response.green_checks;
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
        });
      }
    }, 10);
  }
}
