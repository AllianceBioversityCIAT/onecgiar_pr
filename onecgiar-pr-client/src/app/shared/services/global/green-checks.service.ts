import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class GreenChecksService {
  submit = null;
  constructor(private api: ApiService) {}

  updateGreenChecks() {
    this.api.resultsSE.GET_greenChecksByResultId().subscribe(({ response }) => {
      this.submit = Boolean(response?.submit);
      this.api.dataControlSE.green_checks = response?.green_checks;
      this.api.resultsSE.PATCH_greenChecksByResultId().subscribe();
    });
  }
}
