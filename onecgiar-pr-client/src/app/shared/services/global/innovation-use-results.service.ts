import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class InnovationUseResultsService {
  resultsList = [];

  constructor(private api: ApiService) {
    this.api.resultsSE.GET_innovationUseResults().subscribe(({ response }) => {
      this.resultsList = response;
    });
  }
}


