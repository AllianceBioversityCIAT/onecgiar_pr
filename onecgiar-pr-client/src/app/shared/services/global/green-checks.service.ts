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
        this.api.resultsSE.GET_greenChecksByResultId().subscribe(({ response }) => {
          this.submit = Boolean(response?.submit);
          this.api.dataControlSE.green_checks = response?.green_checks;
          this.api.resultsSE.PATCH_greenChecksByResultId().subscribe();
        });
      }
    }, 1000);
  }
}
