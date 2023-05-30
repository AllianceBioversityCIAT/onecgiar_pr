import { Injectable } from '@angular/core';
import { ApiService } from '../api/api.service';

@Injectable({
  providedIn: 'root'
})
export class PolicyControlListService {
  policyTypesList = [];
  policyStages = [];
  constructor(private api: ApiService) {
    this.GET_clarisaPolicyTypes();
    this.GET_clarisaPolicyStages();
  }

  GET_clarisaPolicyTypes() {
    this.api.resultsSE.GET_clarisaPolicyTypes().subscribe(
      ({ response }) => {
        //(response);
        this.policyTypesList = response;
        //(response);
      },
      err => {
        console.error(err);
      }
    );
  }
  GET_clarisaPolicyStages() {
    this.api.resultsSE.GET_clarisaPolicyStages().subscribe(
      ({ response }) => {
        //(response);
        this.policyStages = response;
        //(response);
      },
      err => {
        console.error(err);
      }
    );
  }
}
