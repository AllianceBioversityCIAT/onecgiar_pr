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
        console.log(response);
        this.policyTypesList = response;
        // console.log(response);
      },
      err => {
        console.log(err);
      }
    );
  }
  GET_clarisaPolicyStages() {
    this.api.resultsSE.GET_clarisaPolicyStages().subscribe(
      ({ response }) => {
        console.log(response);
        this.policyStages = response;
        // console.log(response);
      },
      err => {
        console.log(err);
      }
    );
  }
}
