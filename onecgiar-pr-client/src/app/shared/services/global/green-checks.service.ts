import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class GreenChecksService {
  constructor(private api: ApiService) {}

  updateGreenChecks() {
    this.api.resultsSE.GET_greenChecksByResultId().subscribe(({ response }) => {
      this.api.dataControlSE.green_checks = response?.green_checks;
    });
  }
}
