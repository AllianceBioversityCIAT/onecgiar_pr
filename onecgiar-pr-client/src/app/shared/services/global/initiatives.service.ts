import { Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class InitiativesService {
  allInitiativesList = [];
  allInitiatives = signal<any[]>([]);
  constructor(private api: ApiService) {
    this.GET_AllWithoutResults();
  }

  GET_AllWithoutResults() {
    this.api.resultsSE.GET_AllInitiatives().subscribe(({ response }) => {
      this.allInitiativesList = response;
      this.allInitiatives.set(response);
    });
  }
}
