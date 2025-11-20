import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';
import { ResultsApiService } from '../api/results-api.service';
import { FieldsManagerService } from '../fields-manager.service';

@Injectable({
  providedIn: 'root'
})
export class GreenChecksService {
  submit = null;

  constructor(
    private readonly api: ApiService,
    private readonly resultsApiSE: ResultsApiService,
    private readonly fieldsManagerSE: FieldsManagerService
  ) {}

  getGreenChecks() {
    if (this.resultsApiSE.currentResultId) {
      if (this.fieldsManagerSE.isP25()) {
        this.api.resultsSE.GET_p25GreenChecksByResultId().subscribe(({ response }) => {
          this.api.dataControlSE.green_checks = response.green_checks;
          console.log(response);
          this.submit = response.submit;
        });
      } else {
        this.api.resultsSE.GET_greenChecksByResultId().subscribe(({ response }) => {
          this.api.dataControlSE.green_checks = response.green_checks;
          console.log(response);
          this.submit = response.submit;
        });
      }
    }
  }
}
