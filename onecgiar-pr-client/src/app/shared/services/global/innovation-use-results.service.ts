import { Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class InnovationUseResultsService {
  resultsList = [];
  /**
   * Same list as a signal, additive (P2-3823). The plain array above is filled asynchronously and
   * never notifies, so a signal-based consumer (bilateral Contributors) could not tell when it
   * arrived. Existing callers keep reading `resultsList` unchanged.
   */
  readonly resultsListSig = signal<any[]>([]);

  constructor(private api: ApiService) {
    this.api.resultsSE.GET_innovationUseResults().subscribe(({ response }) => {
      this.resultsList = response;
      this.resultsListSig.set(Array.isArray(response) ? response : []);
    });
  }
}


