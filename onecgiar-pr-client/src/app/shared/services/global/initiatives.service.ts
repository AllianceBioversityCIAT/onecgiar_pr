import { Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { filterOutAvisaFromInitiativeEntityGroups } from '../../utils/avisa-initiative.util';

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
    this.api.resultsSE.GET_AllInitiativesEntities().subscribe(({ response }) => {
      const filtered = filterOutAvisaFromInitiativeEntityGroups(response);
      this.allInitiativesList = filtered;
      this.allInitiatives.set(filtered);
    });
  }
}
